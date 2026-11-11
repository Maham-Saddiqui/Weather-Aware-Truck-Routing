import json
from functools import cache
from importlib import import_module
from pathlib import Path
from typing import Any

import yaml
from django.http.response import HttpResponseBase

SPEC_PATH = Path(__file__).resolve().parents[3] / "docs" / "api" / "openapi.yaml"

type Json = dict[str, Any]

# The type stubs for jsonschema are not among the locked dependencies, so it is loaded dynamically.
jsonschema = import_module("jsonschema")


@cache
def load_spec() -> Json:
    spec: Json = yaml.safe_load(SPEC_PATH.read_text())
    return spec


def assert_conforms(response: HttpResponseBase, path: str, method: str) -> None:
    """The status, headers, media type and JSON body must all be what the contract documents."""
    spec = load_spec()
    documented = spec["paths"][path][method]["responses"]
    status = str(response.status_code)
    assert status in documented, f"{method} {path} answered {status}, which the contract omits"
    declared = _resolve(documented[status], spec)
    _assert_headers(response, declared.get("headers", {}), spec)
    ((media_type, content),) = declared["content"].items()
    assert response["Content-Type"].startswith(media_type)
    schema = {**content["schema"], "components": spec["components"]}
    validator = jsonschema.Draft202012Validator(schema, format_checker=jsonschema.FormatChecker())
    validator.validate(json.loads(b"".join(response)))


def _assert_headers(response: HttpResponseBase, headers: Json, spec: Json) -> None:
    for name, header in headers.items():
        assert name in response, f"The contract requires the {name} header"
        constant = _resolve(header, spec)["schema"].get("const")
        if constant is not None:
            assert response[name] == constant


def _resolve(node: Json, spec: Json) -> Json:
    if "$ref" not in node:
        return node
    target: Json = spec
    for part in node["$ref"].removeprefix("#/").split("/"):
        target = target[part]
    return target

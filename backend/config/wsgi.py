import os

from django.conf import settings
from django.core.wsgi import get_wsgi_application

from config import container
from config.startup import (
    fail_if_deployment_setting_is_missing,
    log_worker_count,
    warn_if_routing_key_is_missing,
)

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

application = get_wsgi_application()
fail_if_deployment_setting_is_missing(settings)
log_worker_count()
warn_if_routing_key_is_missing(settings.TOMTOM_API_KEY)
# Built before the first request, so two simultaneous first requests cannot build two bundles.
container.providers()

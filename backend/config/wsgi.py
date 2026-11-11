import os

from django.core.wsgi import get_wsgi_application

from config import container
from config.startup import log_worker_count

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

application = get_wsgi_application()
log_worker_count()
# Built before the first request, so two simultaneous first requests cannot build two bundles.
container.providers()

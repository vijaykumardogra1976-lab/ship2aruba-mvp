from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is not None:
        errors = response.data
        if isinstance(errors, dict) and "detail" not in errors:
            response.data = {"detail": "Validation error.", "errors": errors}
        elif isinstance(errors, list):
            response.data = {"detail": errors[0] if errors else "Error.", "errors": {}}
    return response

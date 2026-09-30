from django.apps import AppConfig


class AiAssistConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'ai_assist'
    verbose_name = 'Sahayak AI Engine'

    def ready(self):
        import ai_assist.signals  # noqa: F401

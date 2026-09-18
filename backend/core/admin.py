from django.contrib import admin
from .models import (
    User, Department, Startup, Challenge, Application, EligibilityResult,
    Evaluation, Contract, ScaleUpEntry, AuditLog, TranslationCache, TranslationLog
)

admin.site.register(User)
admin.site.register(Department)
admin.site.register(Startup)
admin.site.register(Challenge)
admin.site.register(Application)
admin.site.register(EligibilityResult)
admin.site.register(Evaluation)
admin.site.register(Contract)
admin.site.register(ScaleUpEntry)
admin.site.register(AuditLog)

# Multilingual support
@admin.register(TranslationCache)
class TranslationCacheAdmin(admin.ModelAdmin):
    list_display = ['source_text_hash_short', 'source_lang', 'target_lang', 'created_at']
    list_filter = ['source_lang', 'target_lang', 'created_at']
    search_fields = ['source_text', 'translated_text']
    readonly_fields = ['source_text_hash', 'created_at']
    
    def source_text_hash_short(self, obj):
        return obj.source_text_hash[:12] + '...'
    source_text_hash_short.short_description = 'Hash'

@admin.register(TranslationLog)
class TranslationLogAdmin(admin.ModelAdmin):
    list_display = ['timestamp', 'source_lang', 'target_lang', 'provider', 'success', 'error_short']
    list_filter = ['success', 'provider', 'source_lang', 'target_lang', 'timestamp']
    search_fields = ['source_text', 'error_message']
    readonly_fields = ['timestamp']
    date_hierarchy = 'timestamp'
    
    def error_short(self, obj):
        if obj.error_message:
            return obj.error_message[:50] + '...' if len(obj.error_message) > 50 else obj.error_message
        return '-'
    error_short.short_description = 'Error'


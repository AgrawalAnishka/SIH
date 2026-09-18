"""
Management command to pre-cache translations for demo data.
Run before demo/judging to avoid live API dependency.

Usage:
    python manage.py precache_translations
    python manage.py precache_translations --languages hi,mr,bn
    python manage.py precache_translations --force  # Re-translate even if cached
"""
from django.core.management.base import BaseCommand
from django.db.models import Q
from core.models import Challenge, Application, Evaluation, TranslationCache
from core.translation_service import translate as translate_text, get_text_hash
import sys


class Command(BaseCommand):
    help = 'Pre-cache translations for all demo/seed data'

    def add_arguments(self, parser):
        parser.add_argument(
            '--languages',
            type=str,
            default='hi,mr,bn,ta,te,kn,ml',
            help='Comma-separated language codes (default: all non-English)'
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force re-translation even if already cached'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be translated without actually translating'
        )

    def handle(self, *args, **options):
        languages = options['languages'].split(',')
        force = options['force']
        dry_run = options['dry_run']

        self.stdout.write(self.style.SUCCESS(f'\n📚 Pre-caching translations for languages: {", ".join(languages)}\n'))

        if dry_run:
            self.stdout.write(self.style.WARNING('🔍 DRY RUN MODE - No translations will be saved\n'))

        # Collect all translatable content
        texts_to_translate = []

        # 1. Challenges
        self.stdout.write('Scanning Challenges...')
        for challenge in Challenge.objects.all():
            texts_to_translate.extend([
                ('challenge', challenge.id, 'title', challenge.title),
                ('challenge', challenge.id, 'background', challenge.background),
                ('challenge', challenge.id, 'outcome_metrics', challenge.outcome_metrics),
                ('challenge', challenge.id, 'constraints', challenge.constraints),
            ])
        self.stdout.write(f'  Found {Challenge.objects.count()} challenges')

        # 2. Applications
        self.stdout.write('Scanning Applications...')
        for application in Application.objects.all():
            texts_to_translate.append(
                ('application', application.id, 'solution_brief', application.solution_brief)
            )
        self.stdout.write(f'  Found {Application.objects.count()} applications')

        # 3. Evaluations (comments)
        self.stdout.write('Scanning Evaluations...')
        for evaluation in Evaluation.objects.exclude(comments=''):
            texts_to_translate.append(
                ('evaluation', evaluation.id, 'comments', evaluation.comments)
            )
        self.stdout.write(f'  Found {Evaluation.objects.exclude(comments="").count()} evaluations with comments')

        total_items = len(texts_to_translate)
        total_translations = total_items * len(languages)

        self.stdout.write(f'\n📊 Summary:')
        self.stdout.write(f'  • {total_items} unique text items')
        self.stdout.write(f'  • {len(languages)} target languages')
        self.stdout.write(f'  • {total_translations} total translations needed\n')

        if dry_run:
            self.stdout.write(self.style.WARNING('Dry run complete. No translations performed.'))
            return

        # Start translating
        self.stdout.write(self.style.SUCCESS('🚀 Starting translation process...\n'))

        success_count = 0
        cached_count = 0
        error_count = 0

        for i, (model_type, model_id, field_name, text) in enumerate(texts_to_translate, 1):
            if not text or not text.strip():
                continue

            text_hash = get_text_hash(text)

            self.stdout.write(
                f'[{i}/{total_items}] Translating {model_type} {model_id} ({field_name[:20]}...)'
            )

            for lang in languages:
                # Check if already cached
                if not force:
                    existing = TranslationCache.objects.filter(
                        source_text_hash=text_hash,
                        target_lang=lang
                    ).first()

                    if existing:
                        cached_count += 1
                        self.stdout.write(f'  ✓ {lang}: already cached', ending='\r')
                        sys.stdout.flush()
                        continue

                # Translate
                try:
                    result = translate_text(text, 'en', lang)
                    
                    if result['source'] in ['bhashini', 'google', 'cache']:
                        success_count += 1
                        source_indicator = '💾' if result['cached'] else '🌐'
                        self.stdout.write(f'  {source_indicator} {lang}: {result["source"]}', ending='\r')
                    else:
                        error_count += 1
                        self.stdout.write(f'  ✗ {lang}: fallback used', ending='\r')
                    
                    sys.stdout.flush()

                except Exception as e:
                    error_count += 1
                    self.stdout.write(self.style.ERROR(f'  ✗ {lang}: {str(e)}'))

            # Newline after each text item
            self.stdout.write('')

        # Final summary
        self.stdout.write(f'\n{"="*60}')
        self.stdout.write(self.style.SUCCESS('✅ Translation pre-caching complete!\n'))
        self.stdout.write(f'📊 Results:')
        self.stdout.write(f'  • Success: {success_count} new translations')
        self.stdout.write(f'  • Cached: {cached_count} already cached')
        self.stdout.write(f'  • Errors: {error_count} fallbacks/errors')
        self.stdout.write(f'  • Total cache size: {TranslationCache.objects.count()} entries\n')

        if error_count > 0:
            self.stdout.write(self.style.WARNING(
                f'⚠️  {error_count} translations failed. Check translation logs for details.'
            ))
            self.stdout.write('Run: python manage.py shell')
            self.stdout.write('>>> from core.models import TranslationLog')
            self.stdout.write('>>> TranslationLog.objects.filter(success=False).order_by("-timestamp")[:10]\n')

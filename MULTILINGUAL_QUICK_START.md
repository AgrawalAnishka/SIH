# 🚀 Multilingual Support - Quick Start Guide

## 5-Minute Setup

### Step 1: Install Dependencies (Already Done)
```bash
cd frontend && npm install  # i18next packages already in package.json
cd backend && pip install -r requirements.txt  # requests already in requirements
```

### Step 2: Apply Migrations
```bash
cd backend
python manage.py migrate
# ✅ Applies: 0007_user_preferred_language, 0008_translationlog_translationcache
```

### Step 3: Pre-Cache Translations (BEFORE DEMO!)
```bash
cd backend
python manage.py precache_translations
# ⏱️ Takes 5-10 minutes
# 📊 Translates all challenges, applications, evaluations
# 💾 Saves to database cache
```

### Step 4: Start & Test
```bash
# Terminal 1
cd backend && python manage.py runserver

# Terminal 2
cd frontend && npm run dev

# Browser: http://localhost:5173
# Login → Click language dropdown → Select Hindi → UI changes! ✨
```

---

## Using in Your Code

### Static UI Text
```jsx
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();
  return <button>{t('common.submit')}</button>;
}
```

### Dynamic Content (Database Text)
```jsx
import TranslatedText from '../components/TranslatedText';

<TranslatedText text={challenge.description} sourceLang="en" />
```

### Add Language Switcher
```jsx
import LanguageSwitcher from './components/LanguageSwitcher';

<LanguageSwitcher variant="sidebar" />  // Full width
<LanguageSwitcher variant="compact" />  // Navbar
```

---

## Translation Keys Reference

Access with `t('category.key')`:

```javascript
// Navigation
t('nav.dashboard')      // "Dashboard" / "डैशबोर्ड"
t('nav.challenges')     // "Challenges" / "சவால்கள்"
t('nav.applications')   // "Applications" / "దరఖాస్తులు"

// Common Actions
t('common.submit')      // "Submit" / "जमा करें"
t('common.loading')     // "Loading..." / "लോడ్ అవుతోంది..."
t('common.save')        // "Save" / "സേവ് ചെയ്യുക"

// Auth
t('auth.login')         // "Login" / "লগইন"
t('auth.signup')        // "Sign Up" / "ಸೈನ್ ಅಪ್"
t('auth.welcomeBack')   // "Welcome back!" / "మీకు స్వాగతం!"

// Dashboard
t('dashboard.welcome')        // "Welcome" / "स्वागत है"
t('dashboard.totalChallenges') // "Total Challenges" / "மொத்த சவால்கள்"

// Forms
t('forms.required')     // "This field is required" / "आवश्यक"
t('forms.invalidEmail') // "Invalid email" / "അസാധുവായ ഇമെയിൽ"
```

See full list in `frontend/public/locales/en/translation.json`

---

## Supported Languages

| Code | Native Name | Coverage |
|------|-------------|----------|
| `en` | English     | Default  |
| `hi` | हिंदी       | 528M speakers |
| `mr` | मराठी       | 83M speakers |
| `bn` | বাংলা       | 97M speakers |
| `ta` | தமிழ்       | 69M speakers |
| `te` | తెలుగు      | 81M speakers |
| `kn` | ಕನ್ನಡ      | 44M speakers |
| `ml` | മലയാളം     | 34M speakers |

**Total**: 80%+ of India's population

---

## File Locations

```
Translation JSONs:    frontend/public/locales/{lang}/translation.json
i18n Config:          frontend/src/i18n.js
Language Switcher:    frontend/src/components/LanguageSwitcher.jsx
Translated Text:      frontend/src/components/TranslatedText.jsx
Translation Service:  backend/core/translation_service.py
Models:               backend/core/models.py (TranslationCache, TranslationLog)
API Endpoint:         POST /api/translate/
Pre-cache Command:    backend/core/management/commands/precache_translations.py
```

---

## Common Commands

```bash
# Pre-cache all demo data
python manage.py precache_translations

# Dry run (see what would be translated)
python manage.py precache_translations --dry-run

# Pre-cache specific languages only
python manage.py precache_translations --languages hi,ta,te

# Force re-translate even if cached
python manage.py precache_translations --force

# Check cache size
python manage.py shell
>>> from core.models import TranslationCache
>>> TranslationCache.objects.count()

# View translation logs
>>> from core.models import TranslationLog
>>> TranslationLog.objects.filter(success=False)[:5]
```

---

## API Endpoints

### Translate Text
```bash
POST /api/translate/
Content-Type: application/json

{
  "text": "This is a challenge",
  "source_lang": "en",
  "target_lang": "hi"
}

Response:
{
  "translated_text": "यह एक चुनौती है",
  "source": "cache",
  "cached": true
}
```

### Get Translation Stats
```bash
GET /api/translation-stats/

Response:
{
  "total_cached_translations": 1247,
  "translations_by_language": [...],
  "recent_failures_24h": 0
}
```

### Update User Language Preference
```bash
PATCH /api/users/{id}/
Content-Type: application/json

{
  "preferred_language": "hi"
}
```

---

## Troubleshooting One-Liners

| Issue | Fix |
|-------|-----|
| Language not changing | Check console (F12), verify JSON files exist |
| Backend 500 on PATCH | Run `python manage.py migrate` |
| TranslatedText stuck loading | Restart backend, check `/api/translate/` |
| Boxes instead of scripts | Modern browser required (Chrome/Firefox) |
| Cache not populating | Run `python manage.py seed_demo_data` first |

---

## Pre-Demo Checklist

- [ ] Migrations applied: `python manage.py migrate`
- [ ] Demo data seeded: `python manage.py seed_demo_data`
- [ ] Translations pre-cached: `python manage.py precache_translations`
- [ ] Cache verified: `TranslationCache.objects.count() > 500`
- [ ] Tested all 8 languages manually
- [ ] Database backed up: `cp db.sqlite3 db.sqlite3.backup`
- [ ] Both servers start without errors
- [ ] No console errors in browser

---

## Resources

- **Full Documentation**: `docs/MULTILINGUAL.md`
- **Code Examples**: `docs/TRANSLATION_INTEGRATION_EXAMPLE.md`
- **Testing Guide**: `docs/MULTILINGUAL_TESTING_GUIDE.md`
- **Implementation Summary**: `MULTILINGUAL_IMPLEMENTATION_SUMMARY.md`

---

## Need Help?

1. Check full docs: `docs/MULTILINGUAL.md`
2. Look for errors in:
   - Browser console (F12 → Console)
   - Backend logs (`python manage.py runserver` output)
   - Network tab (F12 → Network)
3. Verify files exist in correct locations (see File Locations above)

---

**🎯 Status**: Ready for demo after running `python manage.py precache_translations`

**⏱️ Time to Demo-Ready**: ~15 minutes (install → migrate → pre-cache → test)

**📝 Remember**: NO COMMITS until explicitly requested by user!

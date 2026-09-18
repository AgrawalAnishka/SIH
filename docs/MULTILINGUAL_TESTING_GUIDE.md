# Multilingual Support - Testing & QA Guide

## Pre-Demo Checklist

### 1. Backend Setup
```bash
cd backend

# Verify migrations applied
python manage.py showmigrations core
# Should show: [X] 0007_user_preferred_language
#              [X] 0008_translationlog_translationcache

# Check database
python manage.py shell
>>> from core.models import User, TranslationCache
>>> User.objects.first().preferred_language  # Should work
>>> TranslationCache.objects.count()  # Should return a number

# Optional: Install translation API dependencies
pip install requests  # Should already be in requirements.txt
```

### 2. Frontend Setup
```bash
cd frontend

# Verify i18n packages installed
npm list i18next react-i18next i18next-browser-languagedetector i18next-http-backend

# Check translation files exist
ls public/locales/en/translation.json
ls public/locales/hi/translation.json
ls public/locales/ta/translation.json
# etc... (8 files total)
```

### 3. Pre-cache Demo Data (CRITICAL for demo)
```bash
cd backend

# Dry run first to see what will be translated
python manage.py precache_translations --dry-run

# Actually pre-cache (this takes time!)
python manage.py precache_translations

# Verify cache populated
python manage.py shell
>>> from core.models import TranslationCache
>>> TranslationCache.objects.count()
# Should show hundreds of entries (depends on demo data size)

# Check cache by language
>>> TranslationCache.objects.values('target_lang').distinct()
# Should show: [{'target_lang': 'hi'}, {'target_lang': 'mr'}, ...]
```

## Testing Workflow

### Test 1: Language Switcher Visibility
**Goal**: Confirm language switcher appears in sidebar

1. Start both servers:
   ```bash
   # Terminal 1
   cd backend && python manage.py runserver
   
   # Terminal 2
   cd frontend && npm run dev
   ```

2. Login as any user (e.g., `meditriage-ai` / `demo1234`)
3. Check sidebar (left side of dashboard)
4. **Expected**: Language dropdown visible above logout button
5. **Expected**: Shows current language (e.g., "English")

**Pass Criteria**: ✅ Language switcher visible and clickable

---

### Test 2: Language Switching (Static UI)
**Goal**: Verify static UI text changes language

1. From dashboard, click language switcher
2. Select **Hindi (हिंदी)**
3. Observe navigation menu, buttons, labels

**Expected Changes**:
- "Dashboard" → "डैशबोर्ड"
- "Challenges" → "चुनौतियाँ"
- "Applications" → "आवेदन"
- "Logout" → "लॉगआउट"

4. Switch to **Tamil (தமிழ்)**

**Expected Changes**:
- "Dashboard" → "டாஷ்போர்டு"
- "Challenges" → "சவால்கள்"
- "Logout" → "வெளியேறு"

**Pass Criteria**: ✅ All 8 languages change UI text correctly

---

### Test 3: Language Persistence (Backend Sync)
**Goal**: Verify language preference saves to database

1. Login as user
2. Switch language to **Marathi (मराठी)**
3. **Verify in Backend**:
   ```bash
   python manage.py shell
   >>> from core.models import User
   >>> u = User.objects.get(username='meditriage-ai')
   >>> u.preferred_language
   # Should show: 'mr'
   ```

4. Logout and login again
5. **Expected**: UI loads in Marathi automatically

6. Open browser DevTools → Network tab
7. Find request to `/api/users/{id}/` (PATCH)
8. **Expected**: Payload contains `{"preferred_language": "mr"}`

**Pass Criteria**: ✅ Preference saves and persists across sessions

---

### Test 4: Dynamic Content Translation
**Goal**: Verify challenge descriptions translate

1. Navigate to Challenges page
2. View a challenge with description
3. **Expected**: 
   - If pre-cached: Translated text appears instantly
   - If not cached: Loading shimmer → translated text appears
   - "Machine translated" badge shows below text
   - "View Original" button present

4. Click **"View Original"**
5. **Expected**: Shows English text, button changes to "Hide Original"

6. Switch language to **Telugu (తెలుగు)**
7. **Expected**: Challenge description translates to Telugu

**Pass Criteria**: ✅ Dynamic content translates with cache indicator

---

### Test 5: Translation Cache Hit
**Goal**: Confirm pre-cached translations load instantly

1. Pre-cache demo data (if not done):
   ```bash
   python manage.py precache_translations
   ```

2. Navigate to any challenge
3. Switch language to Hindi
4. **Expected**: 
   - No loading spinner
   - Text appears immediately
   - Badge shows "Machine translated (cached)"

5. Open DevTools → Network
6. **Expected**: NO request to `/api/translate/` (served from cache)

**Pass Criteria**: ✅ Cached translations load instantly, no API calls

---

### Test 6: Translation Fallback
**Goal**: Verify graceful failure when translation unavailable

1. Navigate to a new challenge (not pre-cached)
2. Switch to Hindi
3. **If translation APIs not configured**:
   - **Expected**: Original English text shows
   - Badge shows "Translation unavailable"
   - No errors in console

4. Check backend logs:
   ```bash
   python manage.py shell
   >>> from core.models import TranslationLog
   >>> TranslationLog.objects.filter(success=False).last()
   # Shows the failure log
   ```

**Pass Criteria**: ✅ Fails gracefully, shows original text

---

### Test 7: Language on Login/Public Pages
**Goal**: Verify language works on non-authenticated pages

1. Logout completely
2. On login page, language should detect from:
   - Browser language (automatic)
   - Or localStorage (if previously set)

3. Change language on login page using compact switcher (if added)
4. **Expected**: Login form labels translate

**Pass Criteria**: ✅ Public pages support language switching

---

### Test 8: All 8 Languages Render Correctly
**Goal**: Verify fonts and scripts display properly

| Language | Test String | Check |
|----------|-------------|-------|
| English | Dashboard | ✓ Latin script |
| Hindi | डैशबोर्ड | ✓ Devanagari |
| Marathi | डॅशबोर्ड | ✓ Devanagari |
| Bengali | ড্যাশবোর্ড | ✓ Bengali script |
| Tamil | டாஷ்போர்டு | ✓ Tamil script |
| Telugu | డ్యాష్‌బోర్డ్ | ✓ Telugu script |
| Kannada | ಡ್ಯಾಶ್‌ಬೋರ್ಡ್ | ✓ Kannada script |
| Malayalam | ഡാഷ്‌ബോർഡ് | ✓ Malayalam script |

**Check**: All scripts display properly (not boxes/mojibake)

**Pass Criteria**: ✅ All 8 languages render correctly

---

### Test 9: Rate Limiting
**Goal**: Verify translation API rate limit works

1. Login as user
2. Open browser console
3. Run:
   ```javascript
   for (let i = 0; i < 102; i++) {
     fetch('/api/translate/', {
       method: 'POST',
       credentials: 'include',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({
         text: 'Test ' + i,
         source_lang: 'en',
         target_lang: 'hi'
       })
     }).then(r => console.log(i, r.status));
   }
   ```

4. **Expected**: First 100 requests succeed (200), next ones fail (429)

**Pass Criteria**: ✅ Rate limit enforces 100 req/hour

---

### Test 10: Admin Panel Integration
**Goal**: Verify translation models visible in admin

1. Login to admin: `http://localhost:8000/admin/`
2. **Expected sections**:
   - Translation caches
   - Translation logs

3. Click "Translation caches"
4. **Expected**: Shows cached translations with source/target languages

5. Click "Translation logs"
6. **Expected**: Shows API call logs (success/failure)

**Pass Criteria**: ✅ Admin panel shows translation data

---

## Performance Tests

### P1: Initial Page Load
**Metric**: Time to interactive with i18n loaded

1. Clear browser cache
2. Hard refresh (Ctrl+Shift+R)
3. Measure in DevTools → Performance

**Target**: < 2 seconds for first load (with HTTP backend lazy loading)

---

### P2: Language Switch Speed
**Metric**: Time from click to UI update

1. Click language switcher
2. Select different language
3. Measure perceived update time

**Target**: < 300ms for static UI switch

---

### P3: Dynamic Translation Load
**Metric**: Time to translate uncached content

1. View challenge description (not pre-cached)
2. Switch language
3. Measure time until translated text appears

**Target**: < 2 seconds (depends on API latency)

---

## Edge Cases to Test

### E1: Very Long Text
- Create challenge with 3000+ character description
- Switch language
- **Expected**: Translates without error or truncation

### E2: Special Characters
- Text with emojis: "🚀 Innovation Challenge 🇮🇳"
- Text with numbers: "Budget: ₹10,00,000"
- **Expected**: Preserves special chars in translation

### E3: Empty/Null Fields
- Challenge with empty description
- **Expected**: No error, just shows empty state

### E4: Mixed Language Content
- Text with both English and Hindi words
- **Expected**: Attempts translation, falls back gracefully

### E5: Rapid Language Switching
- Switch between 3 languages quickly (< 1 second each)
- **Expected**: No race conditions, shows correct final language

---

## Troubleshooting Common Issues

### Issue: Language not changing
**Check**:
1. Console for i18next errors
2. Network tab for 404s on translation JSON files
3. Verify translation files exist in `public/locales/{lang}/translation.json`

**Fix**: Ensure translation files are in `public/` not `src/`

---

### Issue: Blank text after switching
**Check**:
1. Translation key exists in target language file
2. Console for missing key warnings

**Fix**: Add missing keys to all translation files

---

### Issue: Backend 500 error on PATCH /users/{id}/
**Check**:
1. Migration applied: `python manage.py showmigrations`
2. Serializer includes field: `UserSerializer.Meta.fields`

**Fix**: Run migration, restart backend

---

### Issue: TranslatedText stuck loading
**Check**:
1. `/api/translate/` endpoint responding (test with Postman)
2. Translation service configured
3. Network connectivity

**Fix**: Check backend logs, verify API keys (if using live APIs)

---

### Issue: Script not displaying (boxes shown)
**Check**:
1. Browser supports Unicode fonts
2. `lang` attribute set on HTML elements

**Fix**: Use system fonts with broad Unicode support (Noto Sans family)

---

## Demo Day Preparation

### 24 Hours Before:
- [ ] Run `python manage.py precache_translations`
- [ ] Verify cache size: `TranslationCache.objects.count() > 500`
- [ ] Test all 8 languages load instantly
- [ ] Clear any error logs
- [ ] Backup database with cached translations

### 1 Hour Before:
- [ ] Both servers running and accessible
- [ ] Test language switch on staging/demo environment
- [ ] Verify no console errors on page load
- [ ] Confirm network latency acceptable

### During Demo:
- [ ] Start in English (universal)
- [ ] Switch to Hindi (largest target audience)
- [ ] Optionally demo Tamil/Telugu (South India representation)
- [ ] Show "View Original" toggle on translated challenge

### Talking Points:
1. "Supports 8 Indian languages covering 80%+ population"
2. "Pre-cached translations for instant load - no API dependency during demo"
3. "User preference persists across devices via backend"
4. "Graceful fallback to English if translation unavailable"

---

## Regression Testing (After Updates)

When modifying code after multilingual implementation:

1. **After any model change**: Re-run migrations, verify `preferred_language` field intact
2. **After UI updates**: Check new strings have translation keys
3. **After API changes**: Test `/api/translate/` still works
4. **After deployment**: Verify translation JSON files deployed to server

---

## Success Metrics

### Functional:
- ✅ All 8 languages switch correctly
- ✅ Preference persists across sessions
- ✅ Dynamic content translates (with cache)
- ✅ Graceful fallback on errors

### Performance:
- ✅ Language switch < 300ms
- ✅ Cached translation load instant
- ✅ Page load < 2s with i18n

### User Experience:
- ✅ Native script display correct
- ✅ No flickering during language switch
- ✅ Original text accessible via toggle
- ✅ Clear "machine translated" indicator

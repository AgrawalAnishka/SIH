# Translation Integration Examples

## Example 1: Simple Button with Translation

### Before:
```jsx
<button>Submit Application</button>
```

### After:
```jsx
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();
  
  return <button>{t('applications.submit')}</button>;
}
```

## Example 2: Form Labels and Validation

### Before:
```jsx
<div>
  <label>Username</label>
  <input type="text" placeholder="Enter username" />
  {error && <span>This field is required</span>}
</div>
```

### After:
```jsx
import { useTranslation } from 'react-i18next';

function MyForm() {
  const { t } = useTranslation();
  
  return (
    <div>
      <label>{t('auth.username')}</label>
      <input type="text" placeholder={t('auth.username')} />
      {error && <span>{t('forms.required')}</span>}
    </div>
  );
}
```

## Example 3: Dashboard Stats

### Before:
```jsx
<div>
  <h2>Total Challenges</h2>
  <p>{count}</p>
</div>
```

### After:
```jsx
import { useTranslation } from 'react-i18next';

function Stats({ count }) {
  const { t } = useTranslation();
  
  return (
    <div>
      <h2>{t('dashboard.totalChallenges')}</h2>
      <p>{count}</p>
    </div>
  );
}
```

## Example 4: Dynamic Content (Database Text)

### Challenge Description:
```jsx
import TranslatedText from '../components/TranslatedText';

function ChallengeCard({ challenge }) {
  return (
    <div>
      <h3>{challenge.title}</h3>
      <TranslatedText 
        text={challenge.description} 
        sourceLang="en"
      />
    </div>
  );
}
```

## Example 5: Status Labels

### Before:
```jsx
const statusLabels = {
  submitted: 'Submitted',
  screening: 'Under Screening',
  eligible: 'Eligible',
  rejected: 'Rejected'
};

<span>{statusLabels[application.status]}</span>
```

### After:
```jsx
import { useTranslation } from 'react-i18next';

function ApplicationStatus({ status }) {
  const { t } = useTranslation();
  
  return <span>{t(`applications.${status}`)}</span>;
}
```

## Example 6: Interpolation with Variables

### Translation file:
```json
{
  "forms": {
    "minLength": "Minimum {{count}} characters required"
  }
}
```

### Usage:
```jsx
const { t } = useTranslation();

// Single variable
<span>{t('forms.minLength', { count: 8 })}</span>
// Output: "Minimum 8 characters required"
```

## Example 7: Navigation Menu

### Before:
```jsx
const menuItems = [
  { path: '/dashboard', label: 'Dashboard', icon: Home },
  { path: '/challenges', label: 'Challenges', icon: Target },
  { path: '/applications', label: 'Applications', icon: FileText }
];
```

### After:
```jsx
import { useTranslation } from 'react-i18next';

function Navigation() {
  const { t } = useTranslation();
  
  const menuItems = [
    { path: '/dashboard', label: t('nav.dashboard'), icon: Home },
    { path: '/challenges', label: t('nav.challenges'), icon: Target },
    { path: '/applications', label: t('nav.applications'), icon: FileText }
  ];
  
  return (
    <nav>
      {menuItems.map(item => (
        <NavLink key={item.path} to={item.path}>
          <item.icon />
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
```

## Example 8: Toast Notifications

### Before:
```jsx
toast({
  title: 'Success',
  description: 'Application submitted successfully'
});
```

### After:
```jsx
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();
  
  const handleSubmit = () => {
    toast({
      title: t('common.success'),
      description: t('applications.submitSuccess')
    });
  };
}
```

## Example 9: Conditional Text

### Before:
```jsx
<p>
  {isLoggedIn 
    ? 'Welcome back!' 
    : 'Please login to continue'}
</p>
```

### After:
```jsx
const { t } = useTranslation();

<p>
  {isLoggedIn 
    ? t('auth.welcomeBack')
    : t('auth.pleaseLogin')}
</p>
```

## Example 10: Table Headers

### Before:
```jsx
<table>
  <thead>
    <tr>
      <th>Startup</th>
      <th>Challenge</th>
      <th>Status</th>
      <th>Submitted On</th>
    </tr>
  </thead>
</table>
```

### After:
```jsx
import { useTranslation } from 'react-i18next';

function ApplicationsTable() {
  const { t } = useTranslation();
  
  return (
    <table>
      <thead>
        <tr>
          <th>{t('applications.startup')}</th>
          <th>{t('applications.challenge')}</th>
          <th>{t('applications.status')}</th>
          <th>{t('applications.submittedOn')}</th>
        </tr>
      </thead>
    </table>
  );
}
```

## Common Patterns

### 1. Extracting `t` at Component Level
```jsx
function MyComponent() {
  const { t } = useTranslation();
  
  // Now use t() anywhere in this component
  return <div>{t('common.loading')}</div>;
}
```

### 2. Using Translation in Class Components
```jsx
import { withTranslation } from 'react-i18next';

class MyComponent extends React.Component {
  render() {
    const { t } = this.props;
    return <div>{t('common.loading')}</div>;
  }
}

export default withTranslation()(MyComponent);
```

### 3. Translation Outside Components (utils, services)
```jsx
import i18n from './i18n';

// In a utility function
function validateForm(data) {
  if (!data.email) {
    return i18n.t('forms.invalidEmail');
  }
}
```

## Best Practices

1. **Consistent Key Structure**: Use dot notation consistently
   - ✅ `auth.login`, `auth.signup`, `auth.logout`
   - ❌ `auth_login`, `AuthLogin`, `login_auth`

2. **Group Related Translations**:
   ```json
   {
     "auth": { "login": "...", "signup": "..." },
     "dashboard": { "welcome": "...", "stats": "..." }
   }
   ```

3. **Avoid Hardcoded Text**: Even simple words
   - ❌ `<button>OK</button>`
   - ✅ `<button>{t('common.confirm')}</button>`

4. **Use TranslatedText for User Content**: Challenge descriptions, application text, comments
   ```jsx
   <TranslatedText text={challenge.description} sourceLang="en" />
   ```

5. **Keep Keys Descriptive**: Use context in the key name
   - ✅ `dashboard.totalChallenges`
   - ❌ `text1`, `label2`

## Quick Reference

| Use Case | Component/Hook |
|----------|---------------|
| Static UI text | `useTranslation()` + `t()` |
| Database content | `<TranslatedText>` |
| Change language | `LanguageSwitcher` |
| Get current language | `i18n.language` |
| Check if ready | `i18n.isInitialized` |

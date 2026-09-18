"""
Translation service with Bhashini primary and Google Translate fallback.
Phase 1 MVP: Returns English text as-is (demo pre-caching handles translations).
Phase 2: Live translation with real API integration.
"""
import hashlib
import os
import requests
from typing import Optional
from .models import TranslationCache, TranslationLog


# Language code mapping for Bhashini API
BHASHINI_LANG_CODES = {
    'en': 'en',
    'hi': 'hi',
    'mr': 'mr',
    'bn': 'bn',
    'ta': 'ta',
    'te': 'te',
    'kn': 'kn',
    'ml': 'ml',
}


def get_text_hash(text: str) -> str:
    """Generate SHA-256 hash of text for cache lookup."""
    return hashlib.sha256(text.encode('utf-8')).hexdigest()


def translate(text: str, source_lang: str = 'en', target_lang: str = 'en') -> dict:
    """
    Translate text from source language to target language.
    
    Returns:
        {
            'translated_text': str,
            'source': 'cache' | 'bhashini' | 'google' | 'fallback',
            'cached': bool
        }
    """
    # If same language, return original
    if source_lang == target_lang:
        return {
            'translated_text': text,
            'source': 'same_language',
            'cached': False
        }
    
    # Check cache first
    text_hash = get_text_hash(text)
    try:
        cached = TranslationCache.objects.get(
            source_text_hash=text_hash,
            target_lang=target_lang
        )
        return {
            'translated_text': cached.translated_text,
            'source': 'cache',
            'cached': True
        }
    except TranslationCache.DoesNotExist:
        pass
    
    # Try Bhashini API
    translated_text = None
    provider = None
    success = False
    error_msg = ''
    
    try:
        result = bhashini_translate(text, source_lang, target_lang)
        if result:
            translated_text = result
            provider = 'bhashini'
            success = True
    except Exception as e:
        error_msg = str(e)
        # Try Google Translate fallback
        try:
            result = google_translate(text, source_lang, target_lang)
            if result:
                translated_text = result
                provider = 'google'
                success = True
        except Exception as e2:
            error_msg = f"Bhashini: {error_msg}, Google: {str(e2)}"
    
    # Log the attempt
    TranslationLog.objects.create(
        source_text=text[:500],  # Limit to 500 chars for logging
        source_lang=source_lang,
        target_lang=target_lang,
        provider=provider or 'unknown',
        success=success,
        error_message=error_msg
    )
    
    # If translation succeeded, cache it
    if translated_text:
        TranslationCache.objects.create(
            source_text_hash=text_hash,
            source_lang=source_lang,
            target_lang=target_lang,
            source_text=text,
            translated_text=translated_text
        )
        return {
            'translated_text': translated_text,
            'source': provider,
            'cached': False
        }
    
    # Complete fallback: return original text
    return {
        'translated_text': text,
        'source': 'fallback_original',
        'cached': False
    }


def bhashini_translate(text: str, source_lang: str, target_lang: str) -> Optional[str]:
    """
    Translate using Bhashini API.
    
    NOTE: Requires BHASHINI_API_KEY and BHASHINI_USER_ID environment variables.
    Apply for API access at: https://bhashini.gov.in/ulca/user/register
    """
    api_key = os.environ.get('BHASHINI_API_KEY')
    user_id = os.environ.get('BHASHINI_USER_ID')
    
    if not api_key or not user_id:
        raise Exception("Bhashini API credentials not configured")
    
    # Map to Bhashini language codes
    src = BHASHINI_LANG_CODES.get(source_lang, source_lang)
    tgt = BHASHINI_LANG_CODES.get(target_lang, target_lang)
    
    # Bhashini API endpoint (using their NMT pipeline)
    url = "https://meity-auth.ulcacontrib.org/ulca/apis/v0/model/getModelsPipeline"
    
    # Step 1: Get pipeline config
    config_payload = {
        "pipelineTasks": [
            {
                "taskType": "translation",
                "config": {
                    "language": {
                        "sourceLanguage": src,
                        "targetLanguage": tgt
                    }
                }
            }
        ],
        "pipelineRequestConfig": {
            "pipelineId": "64392f96daac500b55c543cd"
        }
    }
    
    headers = {
        "userID": user_id,
        "ulcaApiKey": api_key,
        "Content-Type": "application/json"
    }
    
    try:
        # Get pipeline configuration
        config_response = requests.post(url, json=config_payload, headers=headers, timeout=10)
        config_response.raise_for_status()
        config_data = config_response.json()
        
        # Extract translation service URL
        if 'pipelineResponseConfig' not in config_data:
            raise Exception("Invalid Bhashini API response")
        
        pipeline_config = config_data['pipelineResponseConfig'][0]
        service_url = pipeline_config['config'][0]['serviceId']
        
        # Step 2: Call translation service
        translate_payload = {
            "pipelineTasks": [
                {
                    "taskType": "translation",
                    "config": {
                        "language": {
                            "sourceLanguage": src,
                            "targetLanguage": tgt
                        },
                        "serviceId": service_url
                    }
                }
            ],
            "inputData": {
                "input": [
                    {
                        "source": text
                    }
                ]
            }
        }
        
        translate_response = requests.post(
            service_url,
            json=translate_payload,
            headers={"Content-Type": "application/json"},
            timeout=15
        )
        translate_response.raise_for_status()
        translate_data = translate_response.json()
        
        # Extract translated text
        if 'pipelineResponse' in translate_data:
            translated = translate_data['pipelineResponse'][0]['output'][0]['target']
            return translated
        
        raise Exception("Translation not found in response")
        
    except Exception as e:
        raise Exception(f"Bhashini API error: {str(e)}")


def google_translate(text: str, source_lang: str, target_lang: str) -> Optional[str]:
    """
    Translate using Google Cloud Translate API.
    
    NOTE: Requires GOOGLE_TRANSLATE_API_KEY environment variable.
    Get API key from: https://console.cloud.google.com/apis/credentials
    """
    api_key = os.environ.get('GOOGLE_TRANSLATE_API_KEY')
    
    if not api_key:
        raise Exception("Google Translate API key not configured")
    
    url = "https://translation.googleapis.com/language/translate/v2"
    
    params = {
        'key': api_key,
        'q': text,
        'source': source_lang,
        'target': target_lang,
        'format': 'text'
    }
    
    try:
        response = requests.post(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        if 'data' in data and 'translations' in data['data']:
            return data['data']['translations'][0]['translatedText']
        
        raise Exception("Translation not found in response")
        
    except Exception as e:
        raise Exception(f"Google Translate API error: {str(e)}")


def bulk_translate(texts: list[str], source_lang: str, target_lang: str) -> list[dict]:
    """
    Translate multiple texts at once.
    Used by precache_translations management command.
    """
    results = []
    for text in texts:
        result = translate(text, source_lang, target_lang)
        results.append(result)
    return results

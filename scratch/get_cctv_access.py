import httpx
import re

client = httpx.Client(follow_redirects=True, timeout=10)
r = client.post('https://cctv.corp8.cloud/auth/register', data={
    'name': 'Bhargav',
    'org': 'Gujarat Police Hackathon',
    'email': 'bhargav@sentinel.gujarat.gov.in',
    'purpose': 'AI CCTV Integration for Gujarat Police Challenge'
})

print("Status:", r.status_code)
print("URL:", r.url)
err = re.search(r'class="err">([^<]+)<', r.text)
if err:
    print("Error in page:", err.group(1))
pw = re.search(r'class="v">([^<]+)<', r.text)
if pw:
    print("PW in page:", pw.group(1))

# Search for any inputs or tokens
tokens = re.findall(r'name="([^"]+)"', r.text)
print("Form input names in page:", tokens)

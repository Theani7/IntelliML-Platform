from groq import Groq
import os
from dotenv import load_dotenv

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# Test transcription (requires audio file - skip for now)
print("Testing LLM...")
response = client.chat.completions.create(
    model="llama-3.1-8b-instant",
    messages=[{"role": "user", "content": "Say 'Groq API is working!'"}]
)
print(response.choices[0].message.content)
from google import genai
import os
from dotenv import load_dotenv

load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

try:
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents="Explain data analysis in one sentence."
    )

    print("✅ API OK")
    print("Réponse :", response.text)

except Exception as e:
    print("❌ ERREUR API")
    print(e)
# 🐝 BeeAI Framework Starter

Esta plantilla contiene ejemplos para que empeices a utilizar el [BeeAI Framework](https://github.com/i-am-bee/beeai-framework) v. 0.1.2 en momentos!.

📚 Revisa la [documentación](https://i-am-bee.github.io/beeai-framework/) para saber más.

## 📦 Requerimientos

- JavaScript [NodeJS > 18](https://nodejs.org/) (idealmente instalado através de [nvm](https://github.com/nvm-sh/nvm)).
- Un proveedor de LLMs, muede ser externo como [WatsonX](https://www.ibm.com/watsonx) (OpenAI, Groq, ...) o local [ollama](https://ollama.com).

## 🛠️ Para empezar

1. Clona este repositorio
2. Instala las dependencias 
```
npm install
npm install @ibm-cloud/watsonx-ai
```
3. Configura tu proyecto creando un archivo `.env` con los valores necesarios.
```
# WatsonX
WATSONX_API_KEY="TU API KEY"
WATSONX_PROJECT_ID="TU PROJECT ID"
WATSONX_REGION="us-south"
LLM_BACKEND="watsonx"

# Framework related
BEE_FRAMEWORK_LOG_PRETTY=true
BEE_FRAMEWORK_LOG_LEVEL="info"
BEE_FRAMEWORK_LOG_SINGLE_LINE="false"
```
4. Ejecuta un agente `npm start src/agents/simpleAgent.ts`

# PlantKB Knowlegde Bot (Local RAG Pipeline Model)
## Introduction
A Knowledge Bot RAG Pipeline I built for MCA during my internship in 2026. This Knowledge Bot utilizes a a vector database using ChromaDB which stores all our embeddings. For the retrieval we then run a hybrid search (bm25 + retrieval search) and feed it through a Qwen3 Embedding 0.6B parameter model and Qwen2.5 Instruct 7B parameter model to deliver an answer. 

## Background & Challenges
It was originally made to crawl a SharePoint of 50+ documents. The pilot is now used in 24 plants country-wide by more than 100+ plant workers. 

I faced some challenges with hardware and deployment. To download such models the hardware that was needed was quite expensive, you simply cannot run a 32B parameter model on a laptop. However, later I realized 
# Getting Started

## Prerequisite

-   Python 3.2+
-   pip (Python package installer)

## Installation

1. **Clone Repository:**
	```
	git clone [https://github.com/Krithik-Kesh/Knowledge-Bot.git]
	```
2. **Download Dependencies:**
	```
	pip install -r requirements.txt
	```
## Usage

**To start up KB backend**, open the to run **python -m uvicorn plantkb.main:app --port 8000** and you will get a description of the apps health process.

This image is an example of the application starting and stopping. To stop the backend just type (CTRL + C) into the terminal while its running.

GET /api/health HTTP/1.1" 200 OK

Means the program is running healthy, any errors other than 200 please document as problems may vary. Refer to common [https status error](https://codingtute.com/http-status-codes/) for a list of errors and what they may mean. If it is error 500 then there is a problem with the internal coding structure in the backend and you must call an operator for repair. 

## Contributing

I welcome contributions to Knowledge-Bot! If you'd like to help improve this project:

1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/CoolFeature`).
3.  Make your changes and commit them (`git commit -m 'Add some Cool Feature'`).
4.  Push to the branch (`git push origin feature/CoolFeature`).
5.  Open a Pull Request.

Please ensure your code adheres to our  [coding guidelines](https://link-to-guidelines.md/)  and feel free to open an issue if you encounter any bugs or have feature suggestions.

1.  License and Acknowledgments: Giving Credit Where It's Due

Always include information about your project's license. This clarifies how others can use your code. Also, it's good practice to acknowledge any libraries, tools, or individuals that helped you along the way.  
License: State your chosen license (e.g., MIT, GPL). Link to the LICENSE.md file.  
Acknowledgments: Thank contributors, resources, or inspirations.

## License

Distributed under the MIT License. See `LICENSE` for more information.

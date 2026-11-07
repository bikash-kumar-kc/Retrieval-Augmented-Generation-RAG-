<div align="center">

# Retrieval Augmented Generation

</div>

## Introduction
This project is about how the Retrieval Augmented Generation or RAG basically works and what kind of problem it solves.
### Problem solve:
 - Context Window Problem
 - Token Cost (each input and output token costs)
 - Hallucinating Behavior on context overload.

## What this project consists:
### Ingestion Pipeline.
This projects show the document ingestion process that includes **Parsing**, **Chunking**, **Vector Embedding**, and **Vector Embedding upload on vector Database**.
In this project I have used : **PDF Parser for parsing**, **Textsplitter from Langchain for chunking** , and **Pine cone for vector embedding and vector uploading**.

### Retrievel Pipeline.
To provide only the relevant context the **retrieval pipeline** first embed the query and then do **vector similarity** search and retrieve the **relevant chunks** and feed to llm.

### Citation Pipeline.
As we know the LLM does hallucinate so the evidence or the proof weather the response is correct or not is major problem. To solve this
I have implemented the **CITATION PIPELINE** that cites from which page of the document is used to **response by llm**.

#### Process Involves:
1. First of all , this process takes the *retrieve chunks* from the ***Retrievel Pipeline*** and then try to extract the *exact quotes*
   that can be used to generate the answer using another LLM.
2. Then, it takes the exact quotes and try to generate metadata like from where the quote is picked up from the available chunks using *exact search, normalized search
   and Fuzzy Search*.
3) Then, the location and other meta data of each chunk is identified as each chunks is stored with page location in the ***INGESTION PIPELINE***
   Now, we have information like : exact quote , and it location.
4) Then, it is sent to *user interface* . The *user interface* shows the citations available for each response and on user interaction the *pdf view shows the related page and with highlight the match quote*
   To match here also : exact, normalized and fuzzy is used with match score. So, the user can decide how *correct the response is.*

## What this project does not consists/improvement:
1. Memory management :
      Here, to manage the context window we are removing each message after the 10 follow up question which is not based
      because the context window does not know the context rather the token. ***I am working on it to add the MEMORY LAYER***
2. Evals :
        I tested it with bunch of document. It works fine but when the context window exceed it starts doing assumption and the
        The solution is *Memory layer*
3. Testing limitation:
        Till date, I have only works with pdf without complex structure like tables, images.
4. Document Type Limitation:
        Till date, It works with only pdf.

## Some ScreenShot:
![Document_Upload_UI](./frontend/public/projectImages/Document_Upload_Ui)


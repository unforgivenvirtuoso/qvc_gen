# qvc_gen

To get the project up and running

Create and activate a virtual enviornment
```
  python -m venv .venv
  source .venv/bin/activate
```

Install python dependencies
```
  pip install -r requirements.txt
```
Start backend server
```
  uvicorn main:app --reload
```
Install node modules and start
```
  npm install
  npm start
```

In the backend dir you will also need to create a .env file with this var
```
  OPENAI_API_KEY=<openai api key here>
```

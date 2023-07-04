FROM python:3.8-slim-buster

WORKDIR /usr/src/app

ENV YT_DATA_API AIzaSyAx4A4EgwdbBWmTlwdR7UIVcj6ms8GnoUY

COPY . .

RUN pip install --no-cache-dir -r requirements.txt

CMD [ "python", "./app.py" ]
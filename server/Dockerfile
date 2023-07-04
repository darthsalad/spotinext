FROM python:3.8.5-slim-buster

RUN apt-get update && apt-get install -y ffmpeg

WORKDIR /app

COPY . .

EXPOSE 8080

RUN pip install --no-cache-dir -r requirements.txt

# CMD [ "python", "./app.py" ]
CMD ["flask", "run", "--host", "0.0.0.0", "--port", "8080"]
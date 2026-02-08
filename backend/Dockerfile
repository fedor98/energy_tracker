FROM python:3.12-alpine

WORKDIR /app

# Install dependencies
# We use --no-cache-dir to keep the image small
RUN pip install --no-cache-dir fastapi uvicorn pydantic

# Copy application code
COPY . .


# Expose port
EXPOSE 8000

# Command to run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

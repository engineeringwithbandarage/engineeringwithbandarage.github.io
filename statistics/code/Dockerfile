# Python analysis environment for the energy statistics datasets (keeps the server's own Python untouched).
FROM python:3.12-slim
RUN pip install --no-cache-dir pandas==2.2.3 numpy==2.1.3 scipy==1.14.1 statsmodels==0.14.4 \
        xlrd==2.0.1 openpyxl==3.1.5 psycopg2-binary==2.9.10 SQLAlchemy==2.0.36
WORKDIR /work

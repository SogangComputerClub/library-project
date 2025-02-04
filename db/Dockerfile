FROM postgres:latest

# Set a default database name
ENV POSTGRES_DB=library

# Copy initialization scripts
COPY init.sql /docker-entrypoint-initdb.d/

# Expose PostgreSQL port
EXPOSE 5432

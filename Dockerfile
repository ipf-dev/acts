FROM node:22-bookworm-slim AS frontend-build

WORKDIR /workspace/apps/frontend

COPY apps/frontend/package.json apps/frontend/package-lock.json ./
RUN npm ci

COPY apps/frontend/ ./
RUN npm run build


FROM eclipse-temurin:21-jdk-jammy AS backend-build

WORKDIR /workspace/apps/backend

COPY apps/backend/gradlew ./
COPY apps/backend/gradle ./gradle
COPY apps/backend/build.gradle.kts ./build.gradle.kts
COPY apps/backend/settings.gradle.kts ./settings.gradle.kts

RUN chmod +x gradlew

COPY apps/backend/src ./src
COPY --from=frontend-build /workspace/apps/frontend/dist ./src/main/resources/static

RUN ./gradlew bootJar --no-daemon
RUN cp build/libs/*.jar /tmp/acts-app.jar


FROM eclipse-temurin:21-jre-jammy

WORKDIR /app

ENV SPRING_PROFILES_ACTIVE=prod \
    SERVER_PORT=8080

COPY --from=backend-build /tmp/acts-app.jar ./app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "/app/app.jar"]

# Gujarat Sentinel — Model 3: VMS Federation (Spring Boot)
FROM maven:3.9-eclipse-temurin-21-alpine AS builder
WORKDIR /build
COPY pom.xml .
COPY src/ src/
RUN mvn package -DskipTests -q

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=builder /build/target/*.jar app.jar
RUN apk add --no-cache curl
EXPOSE 8003
HEALTHCHECK --interval=20s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8003/actuator/health || exit 1
ENTRYPOINT ["java", "-Xms256m", "-Xmx512m", "-jar", "app.jar"]

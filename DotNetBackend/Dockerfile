FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build

RUN apt-get update && apt-get install -y clang zlib1g-dev

WORKDIR /src
COPY . .
RUN dotnet publish DotNetBackend/DotNetBackend.csproj -c Release -r linux-x64 --self-contained -o /app/publish

FROM mcr.microsoft.com/dotnet/runtime-deps:10.0
WORKDIR /app
COPY --from=build /app/publish .
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080
ENTRYPOINT ["./DotNetBackend"]

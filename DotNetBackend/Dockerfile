FROM mcr.microsoft.com/dotnet/sdk:10.0-alpine AS build

RUN apk add --no-cache clang zlib-dev

WORKDIR /src

COPY DotNetBackend/DotNetBackend.csproj DotNetBackend/
COPY DotNetBackend.Tests/DotNetBackend.Tests.csproj DotNetBackend.Tests/
COPY Directory.Build.props .
COPY DotNetBackend.slnx .
RUN dotnet restore DotNetBackend/DotNetBackend.csproj -r linux-musl-x64

COPY . .
RUN dotnet publish DotNetBackend/DotNetBackend.csproj -c Release -r linux-musl-x64 --self-contained --no-restore -o /app/publish

FROM mcr.microsoft.com/dotnet/runtime-deps:10.0-alpine
WORKDIR /app
COPY --from=build /app/publish .
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080
ENTRYPOINT ["./DotNetBackend"]

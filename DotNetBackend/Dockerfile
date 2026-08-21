FROM mcr.microsoft.com/dotnet/sdk:10.0-alpine AS build

ENV DOTNET_CLI_TELEMETRY_OPTOUT=1
ENV DOTNET_NOLOGO=1

RUN apk add --no-cache clang zlib-dev

WORKDIR /src

COPY DotNetBackend/DotNetBackend.csproj DotNetBackend/
COPY Directory.Build.props .
COPY DotNetBackend.slnx .
RUN dotnet restore DotNetBackend/DotNetBackend.csproj -r linux-musl-x64

COPY . .
RUN dotnet publish DotNetBackend/DotNetBackend.csproj -c Release -r linux-musl-x64 --self-contained -p:StripSymbols=false -o /app/publish

FROM mcr.microsoft.com/dotnet/runtime-deps:10.0-alpine
WORKDIR /app
COPY --from=build /app/publish .
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080
ENTRYPOINT ["./DotNetBackend"]

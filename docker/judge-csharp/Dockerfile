FROM mcr.microsoft.com/dotnet/sdk:8.0

ENV DOTNET_CLI_TELEMETRY_OPTOUT=1 \
    DOTNET_SKIP_FIRST_TIME_EXPERIENCE=1 \
    DOTNET_NOLOGO=1 \
    DOTNET_CLI_HOME=/tmp

RUN useradd \
    --create-home \
    --uid 10001 \
    --shell /bin/bash \
    judge

RUN dotnet new console \
      --name App \
      --output /opt/csharp-template \
    && dotnet build /opt/csharp-template \
      -c Release \
      -o /opt/csharp-template/out \
    && chmod -R a+rX /opt/csharp-template

USER judge

WORKDIR /workspace

CMD ["dotnet", "--version"]
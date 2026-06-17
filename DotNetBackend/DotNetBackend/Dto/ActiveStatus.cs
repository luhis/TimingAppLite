namespace DotNetBackend.Dto;

public static class ActiveStatus
{
    //todo to enum?
    public const string Live = "0";
    public const string Scheduled = "1";
    public const string Finalised = "2";
    public const string Provisional = "3";
}
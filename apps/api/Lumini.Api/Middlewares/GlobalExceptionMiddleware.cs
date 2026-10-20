using System.Net;
using System.Text.Json;

namespace Lumini.Api.Middlewares;

public class GlobalExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionMiddleware> _logger;

    public GlobalExceptionMiddleware(RequestDelegate next, ILogger<GlobalExceptionMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            await HandleExceptionAsync(context, ex);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        var correlationId = context.Items["CorrelationId"]?.ToString() ?? Guid.NewGuid().ToString("N");
        
        _logger.LogError(exception, "[{CorrelationId}] Exceção não tratada capturada pelo middleware.", correlationId);

        var (statusCode, errorCode, message) = exception switch
        {
            UnauthorizedAccessException => (HttpStatusCode.Unauthorized, "AUTHENTICATION_REQUIRED", "Acesso não autorizado ou sessão expirada."),
            InvalidOperationException => (HttpStatusCode.Conflict, "BUSINESS_RULE_VIOLATION", exception.Message),
            ArgumentException => (HttpStatusCode.BadRequest, "VALIDATION_ERROR", exception.Message),
            _ => (HttpStatusCode.InternalServerError, "INTERNAL_ERROR", "Ocorreu um erro interno no servidor. Por favor, contate o suporte com o Correlation ID.")
        };

        context.Response.ContentType = "application/json";
        context.Response.StatusCode = (int)statusCode;

        var responsePayload = new
        {
            error = new
            {
                code = errorCode,
                message,
                correlationId,
                timestamp = DateTime.UtcNow.ToString("o")
            }
        };

        var json = JsonSerializer.Serialize(responsePayload, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        });

        await context.Response.WriteAsync(json);
    }
}

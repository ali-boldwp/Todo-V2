using System.Diagnostics;
using System.Net;
using System.Text;
using System.Windows;

namespace DevManager.Desktop;

public partial class MainWindow : Window
{
    private const string DefaultLiveAppUrl = "https://beta.devregion.com/";
    private const string CallbackHost = "127.0.0.1";
    private const int CallbackPort = 47695;
    private const string CallbackPath = "auth/callback";

    private HttpListener? _httpListener;
    private CancellationTokenSource? _listenerCts;
    private string? _expectedState;

    private string CallbackUrl => $"http://{CallbackHost}:{CallbackPort}/{CallbackPath}/";

    public MainWindow()
    {
        InitializeComponent();
    }

    private async void LoginButton_Click(object sender, RoutedEventArgs e)
    {
        try
        {
            await EnsureListenerStartedAsync();

            _expectedState = Guid.NewGuid().ToString("N");
            var loginUrl = BuildLoginUrl();
            StatusTextBlock.Text = "Status: Waiting for authorization in browser...";

            Process.Start(new ProcessStartInfo
            {
                FileName = loginUrl,
                UseShellExecute = true
            });
        }
        catch (Exception ex)
        {
            StatusTextBlock.Text = $"Status: Login failed to start ({ex.Message})";
        }
    }

    private string BuildLoginUrl()
    {
        var configuredBaseUrl = Environment.GetEnvironmentVariable("DESKTOP_LIVE_LOGIN_URL");
        var baseUrl = string.IsNullOrWhiteSpace(configuredBaseUrl) ? DefaultLiveAppUrl : configuredBaseUrl;
        var separator = baseUrl.Contains('?') ? '&' : '?';
        return $"{baseUrl}{separator}ide=webstorm&redirect_uri={Uri.EscapeDataString(CallbackUrl)}&state={_expectedState}";
    }

    private Task EnsureListenerStartedAsync()
    {
        if (_httpListener is not null)
        {
            return Task.CompletedTask;
        }

        _listenerCts = new CancellationTokenSource();
        _httpListener = new HttpListener();
        _httpListener.Prefixes.Add($"http://{CallbackHost}:{CallbackPort}/{CallbackPath}/");
        _httpListener.Start();

        _ = Task.Run(() => ListenForCallbacksAsync(_listenerCts.Token));
        return Task.CompletedTask;
    }

    private async Task ListenForCallbacksAsync(CancellationToken cancellationToken)
    {
        if (_httpListener is null)
        {
            return;
        }

        while (!cancellationToken.IsCancellationRequested)
        {
            HttpListenerContext context;
            try
            {
                context = await _httpListener.GetContextAsync();
            }
            catch (HttpListenerException)
            {
                break;
            }
            catch (ObjectDisposedException)
            {
                break;
            }

            ProcessCallback(context);
        }
    }

    private void ProcessCallback(HttpListenerContext context)
    {
        var query = context.Request.QueryString;
        var state = query["state"];
        var code = query["code"];
        var accessToken = query["access_token"] ?? query["token"];

        var success = state == _expectedState && (!string.IsNullOrWhiteSpace(code) || !string.IsNullOrWhiteSpace(accessToken));

        Dispatcher.Invoke(() =>
        {
            if (success)
            {
                StatusTextBlock.Text = "Status: Authorized successfully. You are logged in.";
            }
            else
            {
                StatusTextBlock.Text = "Status: Authorization callback received, but validation failed.";
            }
        });

        var responseHtml = success
            ? "<html><body><h2>Login complete.</h2><p>You can return to DevManager Desktop.</p></body></html>"
            : "<html><body><h2>Login failed.</h2><p>Please return to DevManager Desktop and try again.</p></body></html>";

        var bytes = Encoding.UTF8.GetBytes(responseHtml);
        context.Response.StatusCode = success ? 200 : 400;
        context.Response.ContentType = "text/html; charset=utf-8";
        context.Response.ContentLength64 = bytes.Length;
        context.Response.OutputStream.Write(bytes, 0, bytes.Length);
        context.Response.OutputStream.Close();
    }

    private void Window_Closing(object? sender, System.ComponentModel.CancelEventArgs e)
    {
        _listenerCts?.Cancel();
        _httpListener?.Stop();
        _httpListener?.Close();
        _httpListener = null;
        _listenerCts?.Dispose();
        _listenerCts = null;
    }
}

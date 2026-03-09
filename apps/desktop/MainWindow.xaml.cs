using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using Microsoft.Web.WebView2.Core;

namespace DevManager.Desktop;

public partial class MainWindow : Window
{
    private const string DefaultLiveAppUrl = "https://beta.devregion.com/";
    private const string CallbackHost = "127.0.0.1";
    private const int CallbackPort = 47695;
    private const string CallbackPath = "auth/callback";

    private static readonly string[] SupportedExtensions =
    {
        ".js", ".jsx", ".ts", ".tsx", ".json", ".html", ".css", ".scss", ".md", ".mjs", ".cjs"
    };

    private readonly Dictionary<string, string> _relativeToFullPath = new(StringComparer.OrdinalIgnoreCase);
    private readonly Random _random = new();
    private HttpListener? _httpListener;
    private CancellationTokenSource? _listenerCts;
    private string? _expectedState;
    private string? _authToken;
    private string? _currentUserId;
    private string? _currentFilePath;
    private bool _editorReady;
    private DemoTask? _currentTask;

    private string CallbackUrl => $"http://{CallbackHost}:{CallbackPort}/{CallbackPath}/";

    public MainWindow()
    {
        InitializeComponent();
    }

    private void TitleBar_MouseLeftButtonDown(object sender, MouseButtonEventArgs e)
    {
        if (e.ClickCount == 2)
        {
            WindowState = WindowState == WindowState.Maximized ? WindowState.Normal : WindowState.Maximized;
            return;
        }
        DragMove();
    }

    private void MinimizeButton_Click(object sender, RoutedEventArgs e)
    {
        WindowState = WindowState.Minimized;
    }

    private void MaximizeRestoreButton_Click(object sender, RoutedEventArgs e)
    {
        WindowState = WindowState == WindowState.Maximized ? WindowState.Normal : WindowState.Maximized;
    }

    private void CloseButton_Click(object sender, RoutedEventArgs e)
    {
        Close();
    }

    private async void Window_Loaded(object sender, RoutedEventArgs e)
    {
        await InitializeEditorAsync();
    }

    private sealed class DemoTask
    {
        public string Id { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Project { get; set; } = string.Empty;
        public string? ProjectId { get; set; }
        public string Priority { get; set; } = "medium";
        public string Estimate { get; set; } = "2h";
        public bool IsFromApi { get; set; }
    }

    private static readonly List<DemoTask> DemoTodoTasks =
    [
        new DemoTask
        {
            Id = "TASK-401",
            Title = "Fix API latency on team dashboard",
            Project = "FreshImpact V3",
            Priority = "high",
            Estimate = "3h",
            Description = "Investigate slow dashboard load caused by unindexed queries. Add indexes for team/task lookups, optimize projection, and verify response time drops below 300ms for median case."
        },
        new DemoTask
        {
            Id = "TASK-517",
            Title = "Implement task activity timeline",
            Project = "Todo V2 Web",
            Priority = "medium",
            Estimate = "4h",
            Description = "Add an activity timeline block in task details showing status change history, assignment changes, and verification events. Ensure entries are sorted and readable on mobile."
        },
        new DemoTask
        {
            Id = "TASK-602",
            Title = "Refactor auth middleware for role scopes",
            Project = "Core API",
            Priority = "high",
            Estimate = "5h",
            Description = "Split existing auth middleware into composable role-scope guards. Replace repeated role checks in routes and add tests for admin, manager, member, and client access boundaries."
        },
        new DemoTask
        {
            Id = "TASK-733",
            Title = "Create onboarding checklist modal",
            Project = "Desktop App",
            Priority = "low",
            Estimate = "2h",
            Description = "Add a first-run onboarding checklist modal with quick actions for login, profile setup, and project selection. Keep it dismissible and persist completion locally."
        }
    ];

    private async Task InitializeEditorAsync()
    {
        try
        {
            await EditorWebView.EnsureCoreWebView2Async();
            EditorWebView.CoreWebView2.WebMessageReceived += EditorWebView_WebMessageReceived;
            EditorWebView.CoreWebView2.Settings.IsStatusBarEnabled = false;
            EditorWebView.CoreWebView2.Settings.IsZoomControlEnabled = false;

            var editorHtmlPath = Path.Combine(AppContext.BaseDirectory, "editor", "index.html");
            if (File.Exists(editorHtmlPath))
            {
                EditorWebView.Source = new Uri(editorHtmlPath);
            }
            else
            {
                EditorWebView.NavigateToString("<html><body style='background:#0e151f;color:#d8e1ee;font-family:Segoe UI;padding:20px;'>Editor assets missing.</body></html>");
            }
        }
        catch (Exception ex)
        {
            VerificationSummaryText.Text = $"Editor init failed: {ex.Message}";
        }
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
                _authToken = accessToken;
                _currentUserId = ExtractUserIdFromJwt(_authToken);
                StatusTextBlock.Text = "Status: Authorized successfully. You are logged in.";
                LoginView.Visibility = Visibility.Collapsed;
                DashboardView.Visibility = Visibility.Visible;
                PendingReviewsCountText.Text = "-";
                VerificationSummaryText.Text = "Checking...";
                _ = LoadRandomTodoTaskAsync();

                LoadWorkspaceFiles();
                if (FileListBox.Items.Count > 0)
                {
                    FileListBox.SelectedIndex = 0;
                }

                if (!string.IsNullOrWhiteSpace(_authToken) && !string.IsNullOrWhiteSpace(_currentUserId))
                {
                    _ = LoadPendingVerificationsAsync(_authToken, _currentUserId);
                }
                else
                {
                    VerificationSummaryText.Text = "Could not read token/user for verification check.";
                }
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

    private async Task<List<DemoTask>> LoadTodoTasksFromApiAsync()
    {
        var result = new List<DemoTask>();
        if (string.IsNullOrWhiteSpace(_authToken))
        {
            return result;
        }

        try
        {
            using var client = new HttpClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _authToken);
            var response = await client.GetAsync($"{GetApiBaseUrl().TrimEnd('/')}/tasks");
            if (!response.IsSuccessStatusCode)
            {
                return result;
            }

            var body = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(body);
            JsonElement tasksElement;
            if (doc.RootElement.ValueKind == JsonValueKind.Array)
            {
                tasksElement = doc.RootElement;
            }
            else if (doc.RootElement.ValueKind == JsonValueKind.Object &&
                     doc.RootElement.TryGetProperty("tasks", out var nestedTasks) &&
                     nestedTasks.ValueKind == JsonValueKind.Array)
            {
                tasksElement = nestedTasks;
            }
            else
            {
                return result;
            }

            var projectNameById = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            try
            {
                var projectsResponse = await client.GetAsync($"{GetApiBaseUrl().TrimEnd('/')}/projects");
                if (projectsResponse.IsSuccessStatusCode)
                {
                    var projectsBody = await projectsResponse.Content.ReadAsStringAsync();
                    using var projectsDoc = JsonDocument.Parse(projectsBody);
                    JsonElement projectsElement;
                    if (projectsDoc.RootElement.ValueKind == JsonValueKind.Array)
                    {
                        projectsElement = projectsDoc.RootElement;
                    }
                    else if (projectsDoc.RootElement.ValueKind == JsonValueKind.Object &&
                             projectsDoc.RootElement.TryGetProperty("projects", out var nestedProjects) &&
                             nestedProjects.ValueKind == JsonValueKind.Array)
                    {
                        projectsElement = nestedProjects;
                    }
                    else
                    {
                        projectsElement = default;
                    }

                    if (projectsElement.ValueKind == JsonValueKind.Array)
                    {
                        foreach (var project in projectsElement.EnumerateArray())
                        {
                            var pid = project.TryGetProperty("_id", out var pidEl) ? pidEl.GetString() : null;
                            var pname = project.TryGetProperty("name", out var pnEl) ? pnEl.GetString() : null;
                            if (!string.IsNullOrWhiteSpace(pid) && !string.IsNullOrWhiteSpace(pname))
                            {
                                projectNameById[pid] = pname;
                            }
                        }
                    }
                }
            }
            catch
            {
                // Optional enrichment only.
            }

            foreach (var task in tasksElement.EnumerateArray())
            {
                var status = task.TryGetProperty("status", out var statusEl) ? statusEl.GetString() : null;
                if (!string.Equals(status, "todo", StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }

                var id = task.TryGetProperty("_id", out var idEl) ? idEl.GetString() : null;
                var title = task.TryGetProperty("title", out var titleEl) ? titleEl.GetString() : null;
                if (string.IsNullOrWhiteSpace(id) || string.IsNullOrWhiteSpace(title))
                {
                    continue;
                }

                var desc = task.TryGetProperty("description", out var descEl) ? descEl.ToString() : "";
                var priority = task.TryGetProperty("priority", out var pEl) ? pEl.GetString() ?? "medium" : "medium";
                var projectName = "Unknown Project";
                string? projectId = null;
                if (task.TryGetProperty("projectId", out var projectEl))
                {
                    if (projectEl.ValueKind == JsonValueKind.Object)
                    {
                        if (projectEl.TryGetProperty("name", out var pn)) projectName = pn.GetString() ?? projectName;
                        if (projectEl.TryGetProperty("_id", out var pid)) projectId = pid.GetString();
                    }
                    else if (projectEl.ValueKind == JsonValueKind.String)
                    {
                        projectId = projectEl.GetString();
                    }
                }
                if (!string.IsNullOrWhiteSpace(projectId) && projectNameById.TryGetValue(projectId, out var resolvedProjectName))
                {
                    projectName = resolvedProjectName;
                }

                result.Add(new DemoTask
                {
                    Id = id,
                    Title = title,
                    Description = FormatTaskDescription(desc),
                    Project = projectName,
                    ProjectId = projectId,
                    Priority = priority,
                    Estimate = "N/A",
                    IsFromApi = true
                });
            }
        }
        catch
        {
            return result;
        }

        return result;
    }

    private async Task LoadRandomTodoTaskAsync()
    {
        StartTaskButton.IsEnabled = false;
        StartTaskButton.Content = "Loading...";
        var candidates = await LoadTodoTasksFromApiAsync();
        if (candidates.Count == 0)
        {
            candidates = DemoTodoTasks;
        }

        if (candidates.Count == 0)
        {
            RandomTaskTitleText.Text = "No TODO task found";
            RandomTaskDescriptionText.Text = "No task is available to start right now.";
            RandomTaskMetaText.Text = "-";
            RandomTaskStatusText.Text = "Status: TODO";
            StartTaskButton.Content = "Start Task";
            VerificationSummaryText.Text = "No task available.";
            return;
        }

        DemoTask nextTask;
        if (candidates.Count == 1)
        {
            nextTask = candidates[0];
        }
        else
        {
            do
            {
                nextTask = candidates[_random.Next(candidates.Count)];
            } while (_currentTask?.Id == nextTask.Id);
        }

        _currentTask = nextTask;
        RandomTaskTitleText.Text = nextTask.Title;
        RandomTaskDescriptionText.Text = nextTask.Description;
        RandomTaskMetaText.Text = $"{nextTask.Id}  |  {nextTask.Project}  |  Priority: {nextTask.Priority.ToUpperInvariant()}  |  Estimate: {nextTask.Estimate}";
        RandomTaskStatusText.Text = "Status: TODO";
        StartTaskButton.IsEnabled = true;
        StartTaskButton.Content = "Start Task";
    }

    private static string FormatTaskDescription(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
        {
            return "No description provided.";
        }

        var value = raw.Trim();
        if (!value.StartsWith("{", StringComparison.Ordinal) && !value.StartsWith("[", StringComparison.Ordinal))
        {
            return raw;
        }

        try
        {
            using var doc = JsonDocument.Parse(value);
            var root = doc.RootElement;
            if (root.ValueKind == JsonValueKind.Object &&
                root.TryGetProperty("blocks", out var blocks) &&
                blocks.ValueKind == JsonValueKind.Array)
            {
                var lines = new List<string>();
                foreach (var block in blocks.EnumerateArray())
                {
                    if (!block.TryGetProperty("data", out var data) || data.ValueKind != JsonValueKind.Object)
                    {
                        continue;
                    }
                    if (!data.TryGetProperty("text", out var textEl))
                    {
                        continue;
                    }
                    var text = textEl.GetString();
                    if (string.IsNullOrWhiteSpace(text))
                    {
                        continue;
                    }
                    var normalized = text.Replace("<br>", "\n", StringComparison.OrdinalIgnoreCase);
                    lines.Add(System.Text.RegularExpressions.Regex.Replace(normalized, "<.*?>", string.Empty));
                }

                if (lines.Count > 0)
                {
                    return string.Join("\n\n", lines);
                }
            }
        }
        catch
        {
            // Keep original text if parse fails.
        }

        return raw;
    }

    private async void StartTaskButton_Click(object sender, RoutedEventArgs e)
    {
        if (_currentTask is null)
        {
            VerificationSummaryText.Text = "No task selected.";
            MessageBox.Show("No task selected yet. Please wait a moment or click Skip Task.", "Task Not Ready", MessageBoxButton.OK, MessageBoxImage.Information);
            return;
        }

        StartTaskButton.IsEnabled = false;
        StartTaskButton.Content = "Starting...";

        if (_currentTask.IsFromApi && !string.IsNullOrWhiteSpace(_authToken))
        {
            try
            {
                using var client = new HttpClient();
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _authToken);
                var response = await client.PostAsync($"{GetApiBaseUrl().TrimEnd('/')}/tasks/{_currentTask.Id}/start", null);
                if (!response.IsSuccessStatusCode)
                {
                    var body = await response.Content.ReadAsStringAsync();
                    var message = "Task start blocked by setup checks.";
                    try
                    {
                        using var doc = JsonDocument.Parse(body);
                        if (doc.RootElement.TryGetProperty("message", out var msgEl))
                        {
                            message = msgEl.GetString() ?? message;
                        }
                    }
                    catch
                    {
                        // ignore parse errors
                    }
                    VerificationSummaryText.Text = message;
                    RandomTaskStatusText.Text = "Status: TODO (setup required)";
                    MessageBox.Show(message, "Cannot Start Task", MessageBoxButton.OK, MessageBoxImage.Warning);
                    StartTaskButton.IsEnabled = true;
                    StartTaskButton.Content = "Start Task";
                    return;
                }
            }
            catch (Exception ex)
            {
                VerificationSummaryText.Text = $"Start failed: {ex.Message}";
                MessageBox.Show($"Start failed: {ex.Message}", "Start Error", MessageBoxButton.OK, MessageBoxImage.Error);
                StartTaskButton.IsEnabled = true;
                StartTaskButton.Content = "Start Task";
                return;
            }
        }

        RandomTaskStatusText.Text = $"Status: IN PROGRESS ({DateTime.Now:HH:mm})";
        VerificationSummaryText.Text = $"Started: {_currentTask.Id}";
        StartTaskButton.IsEnabled = false;
        StartTaskButton.Content = "Started";
    }

    private async void SkipTaskButton_Click(object sender, RoutedEventArgs e)
    {
        VerificationSummaryText.Text = "Skipped current task. Loaded another TODO task.";
        await LoadRandomTodoTaskAsync();
    }

    private void LoadWorkspaceFiles()
    {
        _relativeToFullPath.Clear();
        var root = GetWorkspaceRoot();
        if (!Directory.Exists(root))
        {
            VerificationSummaryText.Text = "Workspace root not found. Set DESKTOP_WORKSPACE_ROOT.";
            FileListBox.ItemsSource = null;
            return;
        }

        var files = Directory.EnumerateFiles(root, "*.*", SearchOption.AllDirectories)
            .Where(path => SupportedExtensions.Contains(Path.GetExtension(path), StringComparer.OrdinalIgnoreCase))
            .Where(path => !IsIgnoredPath(path))
            .Take(1200)
            .Select(path => Path.GetRelativePath(root, path))
            .OrderBy(path => path)
            .ToList();

        foreach (var relative in files)
        {
            _relativeToFullPath[relative] = Path.Combine(root, relative);
        }

        FileListBox.ItemsSource = files;
    }

    private static bool IsIgnoredPath(string path)
    {
        var normalized = path.Replace('\\', '/');
        return normalized.Contains("/node_modules/", StringComparison.OrdinalIgnoreCase)
            || normalized.Contains("/bin/", StringComparison.OrdinalIgnoreCase)
            || normalized.Contains("/obj/", StringComparison.OrdinalIgnoreCase)
            || normalized.Contains("/dist/", StringComparison.OrdinalIgnoreCase)
            || normalized.Contains("/.git/", StringComparison.OrdinalIgnoreCase);
    }

    private static string GetWorkspaceRoot()
    {
        var fromEnv = Environment.GetEnvironmentVariable("DESKTOP_WORKSPACE_ROOT");
        if (!string.IsNullOrWhiteSpace(fromEnv))
        {
            return fromEnv;
        }

        // Fallback to repository root relative to desktop output folder.
        return Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", ".."));
    }

    private async void FileListBox_SelectionChanged(object sender, SelectionChangedEventArgs e)
    {
        if (FileListBox.SelectedItem is not string relativePath)
        {
            return;
        }
        if (!_relativeToFullPath.TryGetValue(relativePath, out var fullPath))
        {
            return;
        }
        if (!File.Exists(fullPath))
        {
            return;
        }

        _currentFilePath = fullPath;
        CurrentFileText.Text = relativePath;

        var content = await File.ReadAllTextAsync(fullPath);
        await SetEditorContentAsync(relativePath, content, GetEditorLanguage(fullPath));
    }

    private async Task SetEditorContentAsync(string relativePath, string content, string language)
    {
        if (EditorWebView.CoreWebView2 is null)
        {
            return;
        }

        var script = $"window.setEditorFile({JsonSerializer.Serialize(relativePath)}, {JsonSerializer.Serialize(content)}, {JsonSerializer.Serialize(language)});";
        await EditorWebView.ExecuteScriptAsync(script);
    }

    private static string GetEditorLanguage(string filePath)
    {
        var ext = Path.GetExtension(filePath).ToLowerInvariant();
        return ext switch
        {
            ".js" => "javascript",
            ".jsx" => "javascript",
            ".ts" => "typescript",
            ".tsx" => "typescript",
            ".json" => "json",
            ".html" => "html",
            ".css" => "css",
            ".scss" => "scss",
            ".md" => "markdown",
            ".mjs" => "javascript",
            ".cjs" => "javascript",
            _ => "plaintext"
        };
    }

    private async void SaveFileButton_Click(object sender, RoutedEventArgs e)
    {
        if (EditorWebView.CoreWebView2 is null || string.IsNullOrWhiteSpace(_currentFilePath))
        {
            return;
        }

        await EditorWebView.ExecuteScriptAsync("window.requestSaveFromHost();");
    }

    private async void EditorWebView_WebMessageReceived(object? sender, CoreWebView2WebMessageReceivedEventArgs e)
    {
        try
        {
            using var doc = JsonDocument.Parse(e.WebMessageAsJson);
            var root = doc.RootElement;
            var type = root.TryGetProperty("type", out var typeElement) ? typeElement.GetString() : null;

            if (string.Equals(type, "ready", StringComparison.Ordinal))
            {
                _editorReady = true;
                return;
            }

            if (!string.Equals(type, "save", StringComparison.Ordinal))
            {
                return;
            }
            if (!_editorReady || string.IsNullOrWhiteSpace(_currentFilePath))
            {
                return;
            }
            if (!root.TryGetProperty("content", out var contentElement))
            {
                return;
            }

            var content = contentElement.GetString() ?? string.Empty;
            await File.WriteAllTextAsync(_currentFilePath, content);
            VerificationSummaryText.Text = $"Saved: {Path.GetFileName(_currentFilePath)}";
        }
        catch (Exception ex)
        {
            VerificationSummaryText.Text = $"Save failed: {ex.Message}";
        }
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

    private static string? ExtractUserIdFromJwt(string? token)
    {
        if (string.IsNullOrWhiteSpace(token))
        {
            return null;
        }

        var parts = token.Split('.');
        if (parts.Length < 2)
        {
            return null;
        }

        try
        {
            var payload = parts[1]
                .Replace('-', '+')
                .Replace('_', '/');
            switch (payload.Length % 4)
            {
                case 2: payload += "=="; break;
                case 3: payload += "="; break;
            }

            var bytes = Convert.FromBase64String(payload);
            using var doc = JsonDocument.Parse(bytes);
            if (doc.RootElement.TryGetProperty("userId", out var userIdElement))
            {
                return userIdElement.GetString();
            }
            if (doc.RootElement.TryGetProperty("sub", out var subElement))
            {
                return subElement.GetString();
            }
        }
        catch
        {
            return null;
        }

        return null;
    }

    private async Task LoadPendingVerificationsAsync(string token, string userId)
    {
        try
        {
            using var client = new HttpClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            var apiUrl = $"{GetApiBaseUrl().TrimEnd('/')}/tasks";
            var response = await client.GetAsync(apiUrl);

            if (!response.IsSuccessStatusCode)
            {
                Dispatcher.Invoke(() =>
                {
                    VerificationSummaryText.Text = $"Verification check failed ({(int)response.StatusCode}).";
                });
                return;
            }

            var body = await response.Content.ReadAsStringAsync();
            var pendingCount = CountPendingForUser(body, userId);

            Dispatcher.Invoke(() =>
            {
                PendingReviewsCountText.Text = pendingCount.ToString();
                VerificationSummaryText.Text = pendingCount > 0
                    ? "You have pending verification tasks."
                    : "No pending verifications for this user.";
            });
        }
        catch (Exception ex)
        {
            Dispatcher.Invoke(() =>
            {
                VerificationSummaryText.Text = $"Verification check error: {ex.Message}";
            });
        }
    }

    private static int CountPendingForUser(string json, string userId)
    {
        using var doc = JsonDocument.Parse(json);
        JsonElement tasksElement;

        if (doc.RootElement.ValueKind == JsonValueKind.Array)
        {
            tasksElement = doc.RootElement;
        }
        else if (doc.RootElement.ValueKind == JsonValueKind.Object &&
                 doc.RootElement.TryGetProperty("tasks", out var nestedTasks) &&
                 nestedTasks.ValueKind == JsonValueKind.Array)
        {
            tasksElement = nestedTasks;
        }
        else
        {
            return 0;
        }

        var count = 0;
        foreach (var task in tasksElement.EnumerateArray())
        {
            var verificationStatus = task.TryGetProperty("verificationStatus", out var vs) ? vs.GetString() : null;
            var status = task.TryGetProperty("status", out var st) ? st.GetString() : null;
            var verifierId = task.TryGetProperty("verifierId", out var vi) ? ExtractObjectId(vi) : null;

            var isPendingVerification = verificationStatus == "pending" || status == "under_verification";
            var assignedToMe = string.Equals(verifierId, userId, StringComparison.Ordinal);
            if (isPendingVerification && assignedToMe)
            {
                count++;
            }
        }

        return count;
    }

    private static string? ExtractObjectId(JsonElement element)
    {
        if (element.ValueKind == JsonValueKind.String)
        {
            return element.GetString();
        }

        if (element.ValueKind == JsonValueKind.Object && element.TryGetProperty("_id", out var idElement))
        {
            if (idElement.ValueKind == JsonValueKind.String)
            {
                return idElement.GetString();
            }
        }

        return null;
    }

    private string GetApiBaseUrl()
    {
        var configuredApiBase = Environment.GetEnvironmentVariable("DESKTOP_API_BASE_URL");
        if (!string.IsNullOrWhiteSpace(configuredApiBase))
        {
            return configuredApiBase;
        }

        var configuredLiveUrl = Environment.GetEnvironmentVariable("DESKTOP_LIVE_LOGIN_URL");
        var liveUrl = string.IsNullOrWhiteSpace(configuredLiveUrl) ? DefaultLiveAppUrl : configuredLiveUrl;
        if (Uri.TryCreate(liveUrl, UriKind.Absolute, out var uri))
        {
            return $"{uri.Scheme}://{uri.Host}{(uri.IsDefaultPort ? "" : $":{uri.Port}")}/api";
        }

        return "https://beta.devregion.com/api";
    }
}

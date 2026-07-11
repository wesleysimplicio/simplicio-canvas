<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function fail_response(string $message, int $status = 400): never {
    http_response_code($status);
    echo json_encode(['error' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') fail_response('POST required', 405);
$body = json_decode((string) file_get_contents('php://input'), true);
$repository = trim((string) ($body['repository'] ?? ''));
if (!preg_match('/^(?:https:\/\/github\.com\/)?([A-Za-z0-9-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?$/', $repository, $match)) {
    fail_response('Use a public GitHub repository as owner/repository.');
}
$owner = $match[1]; $repo = $match[2]; $slug = $owner . '/' . $repo;

function github_request(string $url, bool $json = true): string|false {
    $curl = curl_init($url);
    curl_setopt_array($curl, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_CONNECTTIMEOUT => 8,
        CURLOPT_TIMEOUT => 20,
        CURLOPT_USERAGENT => 'Simplicio-Canvas/1.0',
        CURLOPT_HTTPHEADER => $json ? ['Accept: application/vnd.github+json'] : [],
    ]);
    $result = curl_exec($curl); curl_close($curl); return $result;
}

function file_is_text(string $path): bool {
    return !preg_match('/\.(png|jpe?g|gif|webp|ico|pdf|zip|woff2?|ttf|lock|mp[34]|mov|wasm)$/i', $path);
}

function zip_fallback(string $slug): array {
    if (!class_exists('ZipArchive')) fail_response('GitHub API limit reached and ZIP support is unavailable on this HostGator PHP runtime.', 502);
    $temporary = tempnam(sys_get_temp_dir(), 'simplicio-');
    $archive = github_request('https://codeload.github.com/' . $slug . '/zip/HEAD', false);
    if ($archive === false || strlen($archive) > 80 * 1024 * 1024 || file_put_contents($temporary, $archive) === false) fail_response('Unable to download the public GitHub repository.', 502);
    $zip = new ZipArchive(); if ($zip->open($temporary) !== true) { @unlink($temporary); fail_response('The GitHub ZIP could not be opened.', 502); }
    $files = [];
    for ($index = 0; $index < $zip->numFiles && count($files) < 300; $index++) {
        $entry = $zip->statIndex($index); $name = (string) ($entry['name'] ?? '');
        $parts = explode('/', $name, 2); $path = $parts[1] ?? '';
        if ($path === '' || str_ends_with($path, '/') || preg_match('/(^|\/)(\.git|node_modules|dist|build|coverage|\.venv|venv)(\/|$)/', $path) || !file_is_text($path) || ($entry['size'] ?? 0) > 1000000) continue;
        $stream = $zip->getStream($name); if (!$stream) continue; $content = stream_get_contents($stream); fclose($stream);
        $files[] = ['path' => $path, 'content' => $content, 'size' => strlen($content)];
    }
    $zip->close(); @unlink($temporary); if (!$files) fail_response('No readable source files were found in this repository.', 422);
    return $files;
}

$metaRaw = github_request('https://api.github.com/repos/' . rawurlencode($owner) . '/' . rawurlencode($repo));
$meta = $metaRaw ? json_decode($metaRaw, true) : null;
$treeRaw = $meta && isset($meta['default_branch']) ? github_request('https://api.github.com/repos/' . rawurlencode($owner) . '/' . rawurlencode($repo) . '/git/trees/' . rawurlencode((string) $meta['default_branch']) . '?recursive=1') : false;
$tree = $treeRaw ? json_decode($treeRaw, true) : null;
$files = [];
if (is_array($tree['tree'] ?? null)) {
    foreach ($tree['tree'] as $entry) {
        if (count($files) >= 300 || ($entry['type'] ?? '') !== 'blob') continue;
        $path = (string) ($entry['path'] ?? '');
        if ($path === '' || preg_match('/(^|\/)(\.git|node_modules|dist|build|coverage|\.venv|venv)(\/|$)/', $path) || !file_is_text($path)) continue;
        $blobRaw = github_request((string) ($entry['url'] ?? ''));
        $blob = $blobRaw ? json_decode($blobRaw, true) : null;
        if (($blob['encoding'] ?? '') !== 'base64' || !isset($blob['content']) || (($blob['size'] ?? 0) > 1000000)) continue;
        $content = base64_decode((string) $blob['content'], true); if ($content === false) continue;
        $files[] = ['path' => $path, 'content' => $content, 'size' => strlen($content)];
    }
}
if (!$files) $files = zip_fallback($slug);
echo json_encode(['name' => $slug, 'files' => $files, 'mapper' => ['available' => false, 'status' => 'hostgator-basic-analysis', 'detail' => 'HostGator public demo uses the Canvas analyzer; local builds can enrich the same project with simplicio-mapper.']], JSON_UNESCAPED_UNICODE);

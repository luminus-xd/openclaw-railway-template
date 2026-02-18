// Served at /setup/app.js
// No fancy syntax: keep it maximally compatible.

(function () {
  var statusEl = document.getElementById('status');
  var authGroupEl = document.getElementById('authGroup');
  var authChoiceEl = document.getElementById('authChoice');
  var logEl = document.getElementById('log');

  function setStatus(s) {
    statusEl.textContent = s;
  }

  var showAllAuthMethods = false;

  function renderAuth(groups) {
    authGroupEl.innerHTML = '';
    for (var i = 0; i < groups.length; i++) {
      var g = groups[i];
      var opt = document.createElement('option');
      opt.value = g.value;
      opt.textContent = g.label + (g.hint ? ' - ' + g.hint : '');
      authGroupEl.appendChild(opt);
    }

    authGroupEl.onchange = function () {
      var sel = null;
      for (var j = 0; j < groups.length; j++) {
        if (groups[j].value === authGroupEl.value) sel = groups[j];
      }
      authChoiceEl.innerHTML = '';
      var opts = (sel && sel.options) ? sel.options : [];
      
      // Filter out interactive OAuth options unless "Show all" is enabled
      var filteredOpts = [];
      var hiddenCount = 0;
      
      for (var k = 0; k < opts.length; k++) {
        var o = opts[k];
        var isInteractive = (
          o.value.toLowerCase().indexOf('cli') >= 0 ||
          o.value.toLowerCase().indexOf('oauth') >= 0 ||
          o.value.toLowerCase().indexOf('device') >= 0 ||
          o.value.toLowerCase().indexOf('codex') >= 0 ||
          o.value.toLowerCase().indexOf('antigravity') >= 0 ||
          o.value.toLowerCase().indexOf('gemini-cli') >= 0 ||
          o.value.toLowerCase().indexOf('qwen-portal') >= 0 ||
          o.value.toLowerCase().indexOf('github-copilot') >= 0
        );
        
        if (!isInteractive || showAllAuthMethods) {
          filteredOpts.push(o);
        } else {
          hiddenCount++;
        }
      }
      
      // Render filtered options
      for (var m = 0; m < filteredOpts.length; m++) {
        var opt2 = document.createElement('option');
        opt2.value = filteredOpts[m].value;
        opt2.textContent = filteredOpts[m].label + (filteredOpts[m].hint ? ' - ' + filteredOpts[m].hint : '');
        authChoiceEl.appendChild(opt2);
      }
      
      // Add "Show all auth methods" option if there are hidden options
      if (hiddenCount > 0 && !showAllAuthMethods) {
        var showAllOpt = document.createElement('option');
        showAllOpt.value = '__show_all__';
        showAllOpt.textContent = '⚠️ すべての認証方式を表示（' + hiddenCount + '件非表示 - ターミナル/OAuthが必要）';
        showAllOpt.style.fontWeight = 'bold';
        showAllOpt.style.color = '#ff9800';
        authChoiceEl.appendChild(showAllOpt);
      }
    };

    authGroupEl.onchange();
  }

  // Handle "Show all auth methods" selection
  authChoiceEl.onchange = function () {
    if (authChoiceEl.value === '__show_all__') {
      showAllAuthMethods = true;
      authGroupEl.onchange(); // Re-render with all options
    }
  };

  function httpJson(url, opts) {
    opts = opts || {};
    opts.credentials = 'same-origin';
    return fetch(url, opts).then(function (res) {
      if (!res.ok) {
        return res.text().then(function (t) {
          throw new Error('HTTP ' + res.status + ': ' + (t || res.statusText));
        });
      }
      return res.json();
    });
  }

  function loadAuthGroups() {
    return httpJson('/setup/api/auth-groups').then(function (j) {
      if (!j.authGroups || j.authGroups.length === 0) {
        console.warn('Auth groups empty, trying status endpoint...');
        throw new Error('Empty auth groups');
      }
      renderAuth(j.authGroups);
    }).catch(function (e) {
      console.error('Failed to load auth groups from fast endpoint:', e);
      // Fallback to loading from status if fast endpoint fails
      return httpJson('/setup/api/status').then(function (j) {
        if (!j.authGroups || j.authGroups.length === 0) {
          console.warn('Auth groups empty in status endpoint too');
          setStatus('警告：プロバイダーリストを読み込めませんでした。セットアップウィザードが正常に動作しない場合があります。');
        }
        renderAuth(j.authGroups || []);
      }).catch(function (e2) {
        console.error('Failed to load auth groups from status endpoint:', e2);
        setStatus('警告：プロバイダーリストを読み込めませんでした。セットアップウィザードが正常に動作しない場合があります。');
        renderAuth([]); // Render empty to unblock UI
      });
    });
  }

  function refreshStatus() {
    setStatus('Loading...');
    var statusDetailsEl = document.getElementById('statusDetails');
    if (statusDetailsEl) {
      statusDetailsEl.innerHTML = '';
    }

    return httpJson('/setup/api/status').then(function (j) {
      var ver = j.openclawVersion ? (' | ' + j.openclawVersion) : '';
      setStatus((j.configured ? '設定済み - /openclawを開いてください' : '未設定 - 下のセットアップを実行してください') + ver);
      
      // Show gateway target and health hints
      if (statusDetailsEl) {
        var detailsHtml = '<div class="muted" style="font-size: 0.9em;">';
        detailsHtml += '<strong>ゲートウェイターゲット：</strong> <code>' + (j.gatewayTarget || '不明') + '</code><br/>';
        detailsHtml += '<strong>ヘルスチェック：</strong> <a href="/healthz" target="_blank">/healthz</a>（ゲートウェイ診断を表示）';
        detailsHtml += '</div>';
        statusDetailsEl.innerHTML = detailsHtml;
      }

      // If channels are unsupported, surface it for debugging.
      if (j.channelsAddHelp && j.channelsAddHelp.indexOf('telegram') === -1) {
        logEl.textContent += '\n注意：このOpenclawビルドは`channels add --help`にTelegramが含まれていません。Telegram自動追加はスキップされます。\n';
      }

    }).catch(function (e) {
      setStatus('Error: ' + String(e));
      if (statusDetailsEl) {
        statusDetailsEl.innerHTML = '<div style="color: #d32f2f;">ステータスの詳細を読み込めませんでした</div>';
      }
    });
  }

  document.getElementById('run').onclick = function () {
    var payload = {
      flow: document.getElementById('flow').value,
      authChoice: authChoiceEl.value,
      authSecret: document.getElementById('authSecret').value,
      telegramToken: document.getElementById('telegramToken').value,
      discordToken: document.getElementById('discordToken').value,
      slackBotToken: document.getElementById('slackBotToken').value,
      slackAppToken: document.getElementById('slackAppToken').value,
      // Custom provider fields
      customProviderId: document.getElementById('customProviderId').value,
      customProviderBaseUrl: document.getElementById('customProviderBaseUrl').value,
      customProviderApi: document.getElementById('customProviderApi').value,
      customProviderApiKeyEnv: document.getElementById('customProviderApiKeyEnv').value,
      customProviderModelId: document.getElementById('customProviderModelId').value
    };

    logEl.textContent = '実行中...\n';

    fetch('/setup/api/run', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (res) {
      return res.text();
    }).then(function (text) {
      var j;
      try { j = JSON.parse(text); } catch (_e) { j = { ok: false, output: text }; }
      logEl.textContent += (j.output || JSON.stringify(j, null, 2));
      return refreshStatus();
    }).catch(function (e) {
      logEl.textContent += '\nError: ' + String(e) + '\n';
    });
  };

  // Pairing approve helper
  var pairingBtn = document.getElementById('pairingApprove');
  if (pairingBtn) {
    pairingBtn.onclick = function () {
      var channel = prompt('チャンネルを入力（telegram または discord）：');
      if (!channel) return;
      channel = channel.trim().toLowerCase();
      if (channel !== 'telegram' && channel !== 'discord') {
        alert('チャンネルは"telegram"または"discord"を入力してください');
        return;
      }
      var code = prompt('ペアリングコードを入力（例：3EY4PUYS）：');
      if (!code) return;
      logEl.textContent += '\nペアリングを承認中：' + channel + '...\n';
      fetch('/setup/api/pairing/approve', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ channel: channel, code: code.trim() })
      }).then(function (r) { return r.text(); })
        .then(function (t) { logEl.textContent += t + '\n'; })
        .catch(function (e) { logEl.textContent += 'Error: ' + String(e) + '\n'; });
    };
  }

  document.getElementById('reset').onclick = function () {
    if (!confirm('セットアップをリセットしますか？設定ファイルが削除され、オンボーディングを再実行できます。')) return;
    logEl.textContent = 'リセット中...\n';
    fetch('/setup/api/reset', { method: 'POST', credentials: 'same-origin' })
      .then(function (res) { return res.text(); })
      .then(function (t) { logEl.textContent += t + '\n'; return refreshStatus(); })
      .catch(function (e) { logEl.textContent += 'Error: ' + String(e) + '\n'; });
  };

  // ========== DEBUG CONSOLE ==========
  var consoleCommandEl = document.getElementById('consoleCommand');
  var consoleArgEl = document.getElementById('consoleArg');
  var consoleRunBtn = document.getElementById('consoleRun');
  var consoleOutputEl = document.getElementById('consoleOutput');

  function runConsoleCommand() {
    var command = consoleCommandEl.value;
    var arg = consoleArgEl.value.trim();

    if (!command) {
      consoleOutputEl.textContent = 'エラー：コマンドを選択してください';
      return;
    }

    // Disable button and show loading state
    consoleRunBtn.disabled = true;
    consoleRunBtn.textContent = '実行中...';
    consoleOutputEl.textContent = 'コマンドを実行中...\n';

    fetch('/setup/api/console/run', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ command: command, arg: arg })
    })
      .then(function (res) {
        return res.text().then(function (text) {
          return { status: res.status, text: text };
        });
      })
      .then(function (result) {
        var j;
        try {
          j = JSON.parse(result.text);
        } catch (_e) {
          j = { ok: false, error: result.text };
        }

        if (j.ok) {
          consoleOutputEl.textContent = j.output || '（出力なし）';
        } else {
          consoleOutputEl.textContent = 'エラー：' + (j.error || j.output || '不明なエラー');
        }

        // Re-enable button
        consoleRunBtn.disabled = false;
        consoleRunBtn.textContent = 'コマンドを実行';
      })
      .catch(function (e) {
        consoleOutputEl.textContent = 'エラー：' + String(e);
        consoleRunBtn.disabled = false;
        consoleRunBtn.textContent = 'コマンドを実行';
      });
  }

  consoleRunBtn.onclick = runConsoleCommand;

  // Enter key in arg field executes command
  consoleArgEl.onkeydown = function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      runConsoleCommand();
    }
  };

  // ========== CONFIG EDITOR ==========
  var configPathEl = document.getElementById('configPath');
  var configContentEl = document.getElementById('configContent');
  var configReloadBtn = document.getElementById('configReload');
  var configSaveBtn = document.getElementById('configSave');
  var configOutputEl = document.getElementById('configOutput');

  function loadConfig() {
    configOutputEl.textContent = '設定を読み込み中...';
    configReloadBtn.disabled = true;
    configSaveBtn.disabled = true;

    fetch('/setup/api/config/raw', {
      method: 'GET',
      credentials: 'same-origin'
    })
      .then(function (res) {
        return res.text().then(function (text) {
          return { status: res.status, text: text };
        });
      })
      .then(function (result) {
        var j;
        try {
          j = JSON.parse(result.text);
        } catch (_e) {
          j = { ok: false, error: result.text };
        }

        if (j.ok) {
          configPathEl.textContent = j.path || 'Unknown';
          configContentEl.value = j.content || '';
          if (j.exists) {
            configOutputEl.textContent = '設定を読み込みました';
          } else {
            configOutputEl.textContent = '設定ファイルが見つかりません。先にオンボーディングを実行してください。';
          }
        } else {
          configOutputEl.textContent = 'エラー：' + (j.error || '不明なエラー');
        }

        configReloadBtn.disabled = false;
        configSaveBtn.disabled = false;
      })
      .catch(function (e) {
        configOutputEl.textContent = 'エラー：' + String(e);
        configReloadBtn.disabled = false;
        configSaveBtn.disabled = false;
      });
  }

  function saveConfig() {
    var content = configContentEl.value;

    configOutputEl.textContent = '設定を保存中...';
    configReloadBtn.disabled = true;
    configSaveBtn.disabled = true;
    configSaveBtn.textContent = '保存中...';

    fetch('/setup/api/config/raw', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content: content })
    })
      .then(function (res) {
        return res.text().then(function (text) {
          return { status: res.status, text: text };
        });
      })
      .then(function (result) {
        var j;
        try {
          j = JSON.parse(result.text);
        } catch (_e) {
          j = { ok: false, error: result.text };
        }

        if (j.ok) {
          configOutputEl.textContent = '成功：' + (j.message || '設定を保存しました') + '\n' + (j.restartOutput || '');
        } else {
          configOutputEl.textContent = 'エラー：' + (j.error || '不明なエラー');
        }

        configReloadBtn.disabled = false;
        configSaveBtn.disabled = false;
        configSaveBtn.textContent = '保存してゲートウェイを再起動';
      })
      .catch(function (e) {
        configOutputEl.textContent = 'エラー：' + String(e);
        configReloadBtn.disabled = false;
        configSaveBtn.disabled = false;
        configSaveBtn.textContent = '保存してゲートウェイを再起動';
      });
  }

  if (configReloadBtn) {
    configReloadBtn.onclick = loadConfig;
  }

  if (configSaveBtn) {
    configSaveBtn.onclick = saveConfig;
  }

  // Auto-load config on page load
  loadConfig();

  // ========== DEVICE PAIRING HELPER ==========
  var devicesRefreshBtn = document.getElementById('devicesRefresh');
  var devicesListEl = document.getElementById('devicesList');

  function refreshDevices() {
    if (!devicesListEl) return;

    devicesListEl.innerHTML = '<p class="muted">読み込み中...</p>';
    if (devicesRefreshBtn) {
      devicesRefreshBtn.disabled = true;
      devicesRefreshBtn.textContent = '読み込み中...';
    }

    fetch('/setup/api/devices/pending', {
      method: 'GET',
      credentials: 'same-origin'
    })
      .then(function (res) {
        return res.text().then(function (text) {
          return { status: res.status, text: text };
        });
      })
      .then(function (result) {
        var j;
        try {
          j = JSON.parse(result.text);
        } catch (_e) {
          j = { ok: false, error: result.text };
        }

        if (j.ok) {
          if (j.requestIds && j.requestIds.length > 0) {
            var html = '<p class="muted">' + j.requestIds.length + '件の保留中デバイスが見つかりました：</p>';
            html += '<ul style="list-style: none; padding: 0;">';
            for (var i = 0; i < j.requestIds.length; i++) {
              var reqId = j.requestIds[i];
              html += '<li id="device-' + reqId + '" style="padding: 0.5rem; margin-bottom: 0.5rem; background: #f5f5f5; border-radius: 4px;">';
              html += '<code style="font-weight: bold;">' + reqId + '</code> ';
              html += '<button class="approve-device" data-requestid="' + reqId + '" style="margin-left: 0.5rem;">承認</button>';
              html += '</li>';
            }
            html += '</ul>';
            html += '<details style="margin-top: 0.75rem;"><summary style="cursor: pointer;">生の出力を表示</summary>';
            html += '<pre style="margin-top: 0.5rem; background: #f5f5f5; padding: 0.5rem; border-radius: 4px; font-size: 11px; max-height: 200px; overflow-y: auto;">' + (j.output || '（出力なし）') + '</pre>';
            html += '</details>';
            devicesListEl.innerHTML = html;

            // Attach click handlers to approve buttons
            var approveButtons = devicesListEl.querySelectorAll('.approve-device');
            for (var k = 0; k < approveButtons.length; k++) {
              approveButtons[k].onclick = function (e) {
                var btn = e.target;
                var reqId = btn.getAttribute('data-requestid');
                approveDevice(reqId, btn);
              };
            }
          } else {
            devicesListEl.innerHTML = '<p class="muted">保留中のデバイスは見つかりませんでした。</p>';
            if (j.output) {
              devicesListEl.innerHTML += '<details style="margin-top: 0.5rem;"><summary style="cursor: pointer;">生の出力を表示</summary>';
              devicesListEl.innerHTML += '<pre style="margin-top: 0.5rem; background: #f5f5f5; padding: 0.5rem; border-radius: 4px; font-size: 11px; max-height: 200px; overflow-y: auto;">' + j.output + '</pre>';
              devicesListEl.innerHTML += '</details>';
            }
          }
        } else {
          devicesListEl.innerHTML = '<p style="color: #d32f2f;">Error: ' + (j.error || j.output || 'Unknown error') + '</p>';
        }

        if (devicesRefreshBtn) {
          devicesRefreshBtn.disabled = false;
          devicesRefreshBtn.textContent = '保留中のデバイスを更新';
        }
      })
      .catch(function (e) {
        devicesListEl.innerHTML = '<p style="color: #d32f2f;">エラー：' + String(e) + '</p>';
        if (devicesRefreshBtn) {
          devicesRefreshBtn.disabled = false;
          devicesRefreshBtn.textContent = '保留中のデバイスを更新';
        }
      });
  }

  function approveDevice(requestId, buttonEl) {
    buttonEl.disabled = true;
    buttonEl.textContent = '承認中...';

    fetch('/setup/api/devices/approve', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ requestId: requestId })
    })
      .then(function (res) {
        return res.text().then(function (text) {
          return { status: res.status, text: text };
        });
      })
      .then(function (result) {
        var j;
        try {
          j = JSON.parse(result.text);
        } catch (_e) {
          j = { ok: false, error: result.text };
        }

        if (j.ok) {
          // Visual feedback: green background and checkmark
          var deviceEl = document.getElementById('device-' + requestId);
          if (deviceEl) {
            deviceEl.style.background = '#4caf50';
            deviceEl.style.color = '#fff';
          }
          buttonEl.textContent = '承認済み ✓';
          buttonEl.disabled = true;
        } else {
          buttonEl.textContent = '失敗';
          buttonEl.disabled = false;
          alert('承認に失敗しました：' + (j.error || j.output || '不明なエラー'));
        }
      })
      .catch(function (e) {
        buttonEl.textContent = 'エラー';
        buttonEl.disabled = false;
        alert('エラー：' + String(e));
      });
  }

  if (devicesRefreshBtn) {
    devicesRefreshBtn.onclick = refreshDevices;
  }

  // ========== BACKUP IMPORT ==========
  var importFileEl = document.getElementById('importFile');
  var importButtonEl = document.getElementById('importButton');
  var importOutputEl = document.getElementById('importOutput');

  function importBackup() {
    var file = importFileEl.files[0];
    
    if (!file) {
      importOutputEl.textContent = 'エラー：ファイルを選択してください';
      return;
    }

    // Validate file type
    var fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.tar.gz') && !fileName.endsWith('.tgz')) {
      importOutputEl.textContent = 'エラー：ファイルは.tar.gzまたは.tgzアーカイブである必要があります';
      return;
    }

    // Validate file size (250MB max)
    var maxSize = 250 * 1024 * 1024;
    if (file.size > maxSize) {
      importOutputEl.textContent = 'エラー：ファイルサイズが250MBの制限を超えています（' + Math.round(file.size / 1024 / 1024) + 'MB）';
      return;
    }

    // Confirmation dialog
    var confirmMsg = '"' + file.name + '"からバックアップをインポートしますか？\n\n' +
                     '以下の処理が行われます：\n' +
                     '- ゲートウェイを停止\n' +
                     '- 既存の設定とワークスペースを上書き\n' +
                     '- ゲートウェイを再起動\n' +
                     '- このページを再読み込み\n\n' +
                     '続行しますか？';

    if (!confirm(confirmMsg)) {
      importOutputEl.textContent = 'インポートをキャンセルしました';
      return;
    }

    // Disable button and show progress
    importButtonEl.disabled = true;
    importButtonEl.textContent = 'インポート中...';
    importOutputEl.textContent = file.name + '（' + Math.round(file.size / 1024 / 1024) + 'MB）をアップロード中...\n';

    // Upload file
    fetch('/setup/import', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'content-type': 'application/gzip'
      },
      body: file
    })
      .then(function (res) {
        return res.text().then(function (text) {
          return { status: res.status, text: text };
        });
      })
      .then(function (result) {
        var j;
        try {
          j = JSON.parse(result.text);
        } catch (_e) {
          j = { ok: false, error: result.text };
        }

        if (j.ok) {
          importOutputEl.textContent = '成功：' + (j.message || 'インポートが完了しました') + '\n\n2秒後にページを再読み込みします...';

          // Reload page after successful import to show fresh state
          setTimeout(function () {
            window.location.reload();
          }, 2000);
        } else {
          importOutputEl.textContent = 'エラー：' + (j.error || 'インポートに失敗しました');
          importButtonEl.disabled = false;
          importButtonEl.textContent = 'バックアップをインポート';
        }
      })
      .catch(function (e) {
        importOutputEl.textContent = 'エラー：' + String(e);
        importButtonEl.disabled = false;
        importButtonEl.textContent = 'バックアップをインポート';
      });
  }

  if (importButtonEl) {
    importButtonEl.onclick = importBackup;
  }

  // Load auth groups immediately (fast endpoint)
  loadAuthGroups();
  
  // Load status (slower, but needed for version info)
  refreshStatus();
})();

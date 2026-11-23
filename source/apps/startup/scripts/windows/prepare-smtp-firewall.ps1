param(
    [Parameter(Mandatory = $true)][string]$Bun,
    [Parameter(Mandatory = $true)][string]$LogPath
)

$ErrorActionPreference = "Stop"
$ruleName = "Babybox Panel SMTP (TCP 25)"
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $LogPath) | Out-Null
$apply = {
    param([string]$Bun, [string]$Name)
    $ErrorActionPreference = "Stop"
    $policy = New-Object -ComObject HNetCfg.FwPolicy2
    $rule = New-Object -ComObject HNetCfg.FWRule
    $rule.Name = $Name
    $rule.ApplicationName = $Bun
    $rule.Protocol = 6
    $rule.LocalPorts = "25"
    $rule.RemoteAddresses = "LocalSubnet"
    $rule.Direction = 1
    $rule.Action = 1
    $rule.Profiles = 2147483647
    $rule.EdgeTraversal = $false
    $rule.Enabled = $true
    if ($policy.Rules | Where-Object { $_.Name -eq $Name }) {
        $policy.Rules.Remove($Name)
    }
    $policy.Rules.Add($rule)
}

try {
    $policy = New-Object -ComObject HNetCfg.FwPolicy2
    $existing = @($policy.Rules | Where-Object { $_.Name -eq $ruleName })
    if ($existing.Count -eq 1) {
        $rule = $existing[0]
        if ($rule.Enabled -and $rule.ApplicationName -eq $Bun -and
            $rule.Direction -eq 1 -and $rule.Action -eq 1 -and
            $rule.Protocol -eq 6 -and $rule.LocalPorts -eq "25" -and
            $rule.RemoteAddresses -eq "LocalSubnet" -and
            $rule.Profiles -eq 2147483647 -and -not $rule.EdgeTraversal) {
            return
        }
    }
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = [Security.Principal.WindowsPrincipal]::new($identity)
    if ($principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        & $apply $Bun $ruleName
    } else {
        # Carry only the fixed rule command and literal arguments across elevation.
        $encodedBun = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($Bun))
        $command = "& { $apply } ([Text.Encoding]::Unicode.GetString([Convert]::FromBase64String('$encodedBun'))) '$ruleName'"
        $encoded = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($command))
        $child = Start-Process -FilePath (Join-Path $PSHOME "powershell.exe") `
            -ArgumentList "-NoProfile", "-NonInteractive", "-EncodedCommand", $encoded `
            -Verb RunAs -WindowStyle Hidden -Wait -PassThru
        if ($child.ExitCode -ne 0) { throw "Firewall rule setup failed." }
    }
    Add-Content -LiteralPath $LogPath -Value "$(Get-Date -Format s) Windows Firewall: SMTP TCP 25 enabled for the local subnet."
} catch {
    Add-Content -LiteralPath $LogPath -Value "$(Get-Date -Format s) Windows Firewall: SMTP TCP 25 rule could not be set. Administrator approval or local firewall policy may be required."
}

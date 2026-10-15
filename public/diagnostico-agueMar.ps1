<#
.SYNOPSIS
  Diagnóstico del equipo para la ficha técnica de agueMar.

.DESCRIPTION
  Reúne datos del equipo, discos (salud y desgaste), batería, espacio libre,
  eventos críticos de los últimos 7 días, BIOS, seguridad y programas de inicio.
  Genera un archivo JSON en el Escritorio y lo copia al portapapeles para pegarlo
  en el panel con "Importar diagnóstico". Solo lee información: no cambia nada.

  Ejecútalo en PowerShell como administrador (así puede leer el desgaste del disco):
    powershell -ExecutionPolicy Bypass -File .\diagnostico-agueMar.ps1

.PARAMETER Salida
  Ruta del JSON. Por defecto: Escritorio\diagnostico-<serie>-<fecha>.json

.PARAMETER SinPortapapeles
  No copia el JSON al portapapeles.
#>
[CmdletBinding()]
param(
  [string]$Salida,
  [switch]$SinPortapapeles
)

$ErrorActionPreference = 'SilentlyContinue'
$avisos = New-Object System.Collections.Generic.List[string]
$identidad = [Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()
$esAdmin = $identidad.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $esAdmin) {
  $avisos.Add('Se ejecutó sin permisos de administrador: el desgaste, la temperatura y los errores del disco pueden faltar.')
}

function Redondear($valor, [int]$decimales = 1) {
  if ($null -eq $valor -or "$valor" -eq '') { return $null }
  return [math]::Round([double]$valor, $decimales)
}

Write-Host ''
Write-Host '  agueMar · diagnóstico del equipo' -ForegroundColor Green
Write-Host '  Reuniendo información, tarda menos de un minuto...'
Write-Host ''

# ---------- Equipo ----------
$cs = Get-CimInstance Win32_ComputerSystem
$csp = Get-CimInstance Win32_ComputerSystemProduct
$bios = Get-CimInstance Win32_BIOS
$os = Get-CimInstance Win32_OperatingSystem
$cpu = Get-CimInstance Win32_Processor | Select-Object -First 1
$ramBytes = (Get-CimInstance Win32_PhysicalMemory | Measure-Object -Property Capacity -Sum).Sum
if (-not $ramBytes) { $ramBytes = $cs.TotalPhysicalMemory }
$graficas = @(Get-CimInstance Win32_VideoController | Where-Object { $_.Name } | ForEach-Object { "$($_.Name)".Trim() })

$modelo = $cs.Model
# En Lenovo el nombre comercial está en Version y Model es el tipo de máquina.
if ($cs.Manufacturer -match 'LENOVO' -and $csp.Version) { $modelo = "$($csp.Version) ($($cs.Model))" }
$biosFecha = $null
if ($bios.ReleaseDate) { $biosFecha = $bios.ReleaseDate.ToString('yyyy-MM-dd') }

$equipo = [ordered]@{
  fabricante        = "$($cs.Manufacturer)".Trim()
  modelo            = "$modelo".Trim()
  serie             = "$($bios.SerialNumber)".Trim()
  nombre_equipo     = $env:COMPUTERNAME
  sistema_operativo = "$($os.Caption)".Trim()
  version_os        = "$($os.Version)"
  procesador        = ("$($cpu.Name)" -replace '\s+', ' ').Trim()
  nucleos           = $cpu.NumberOfCores
  ram_gb            = Redondear ($ramBytes / 1GB) 0
  graficas          = $graficas
  bios_version      = "$($bios.SMBIOSBIOSVersion)".Trim()
  bios_fecha        = $biosFecha
}

# ---------- Discos ----------
$discos = @()
foreach ($d in @(Get-PhysicalDisk)) {
  $r = $null
  if ($esAdmin) { $r = $d | Get-StorageReliabilityCounter }
  $discos += [ordered]@{
    nombre            = "$($d.FriendlyName)".Trim()
    tipo_medio        = "$($d.MediaType)"
    bus               = "$($d.BusType)"
    tamano_gb         = Redondear ($d.Size / 1GB) 0
    salud             = "$($d.HealthStatus)"
    estado_operativo  = (@($d.OperationalStatus) -join ', ')
    desgaste_pct      = $r.Wear
    temperatura_c     = $r.Temperature
    horas_encendido   = $r.PowerOnHours
    errores_lectura   = $r.ReadErrorsTotal
    errores_escritura = $r.WriteErrorsTotal
  }
}

$volumenes = @(Get-Volume | Where-Object { $_.DriveLetter -and $_.DriveType -eq 'Fixed' -and $_.Size -gt 0 } | Sort-Object DriveLetter | ForEach-Object {
  [ordered]@{
    letra    = "$($_.DriveLetter):"
    etiqueta = $_.FileSystemLabel
    total_gb = Redondear ($_.Size / 1GB) 0
    libre_gb = Redondear ($_.SizeRemaining / 1GB) 0
  }
})

# ---------- Batería (powercfg /batteryreport) ----------
$bateria = $null
if (Get-CimInstance Win32_Battery) {
  $xmlRuta = Join-Path $env:TEMP 'agueMar-bateria.xml'
  powercfg /batteryreport /xml /output "$xmlRuta" | Out-Null
  if (Test-Path $xmlRuta) {
    [xml]$reporte = Get-Content $xmlRuta -Raw
    $b = @($reporte.BatteryReport.Batteries.Battery)[0]
    if ($b) {
      $diseno = [double]$b.DesignCapacity
      $actual = [double]$b.FullChargeCapacity
      $bateria = [ordered]@{
        fabricante             = "$($b.Manufacturer)".Trim()
        quimica                = "$($b.Chemistry)".Trim()
        nombre                 = "$($b.Id)".Trim()
        capacidad_diseno_mwh   = $diseno
        capacidad_completa_mwh = $actual
        salud_pct              = $(if ($diseno -gt 0) { Redondear ($actual / $diseno * 100) 1 } else { $null })
        ciclos                 = $(if ("$($b.CycleCount)" -ne '') { [int]$b.CycleCount } else { $null })
      }
    }
    Remove-Item $xmlRuta -Force
  } else {
    $avisos.Add('No se pudo generar el reporte de batería (powercfg).')
  }
}

# ---------- Eventos críticos y errores de 7 días ----------
$desde = (Get-Date).AddDays(-7)
$eventos = @(Get-WinEvent -FilterHashtable @{ LogName = 'System', 'Application'; Level = 1, 2; StartTime = $desde } -MaxEvents 1000)
$criticos = @($eventos | Where-Object { $_.Level -eq 1 })
$errores = @($eventos | Where-Object { $_.Level -eq 2 })
$recientes = @($eventos | Sort-Object Level, TimeCreated -Descending | Select-Object -First 8 | ForEach-Object {
  $primera = "$($_.Message)".Split("`n")[0].Trim()
  [ordered]@{
    fecha   = $_.TimeCreated.ToString('yyyy-MM-ddTHH:mm:ss')
    nivel   = $(if ($_.Level -eq 1) { 'critico' } else { 'error' })
    origen  = $_.ProviderName
    id      = $_.Id
    mensaje = $(if ($primera.Length -gt 200) { $primera.Substring(0, 200) } else { $primera })
  }
})

# ---------- Seguridad y actualizaciones ----------
$defender = Get-MpComputerStatus
$firewall = @(Get-NetFirewallProfile)
$ultimaActualizacion = Get-HotFix | Where-Object { $_.InstalledOn } | Sort-Object InstalledOn -Descending | Select-Object -First 1
$seguridad = [ordered]@{
  antivirus_activo       = $(if ($defender) { [bool]$defender.AntivirusEnabled } else { $null })
  proteccion_tiempo_real = $(if ($defender) { [bool]$defender.RealTimeProtectionEnabled } else { $null })
  firmas_actualizadas    = $(if ($defender -and $defender.AntivirusSignatureLastUpdated) { $defender.AntivirusSignatureLastUpdated.ToString('yyyy-MM-dd') } else { $null })
  firewall_activo        = $(if ($firewall.Count) { -not ($firewall | Where-Object { -not $_.Enabled }) } else { $null })
  ultima_actualizacion   = $(if ($ultimaActualizacion) { $ultimaActualizacion.InstalledOn.ToString('yyyy-MM-dd') } else { $null })
}

# ---------- Programas de inicio ----------
$inicio = @(Get-CimInstance Win32_StartupCommand | ForEach-Object {
  [ordered]@{ nombre = $_.Name; comando = $_.Command; ubicacion = $_.Location }
})

# ---------- Resultado ----------
$resultado = [ordered]@{
  version     = 1
  herramienta = 'diagnostico-agueMar.ps1'
  generado    = (Get-Date).ToString('yyyy-MM-ddTHH:mm:sszzz')
  es_admin    = $esAdmin
  equipo      = $equipo
  discos      = $discos
  volumenes   = $volumenes
  bateria     = $bateria
  eventos     = [ordered]@{ dias = 7; criticos = $criticos.Count; errores = $errores.Count; recientes = $recientes }
  seguridad   = $seguridad
  inicio      = $inicio
  avisos      = @($avisos)
}
$json = $resultado | ConvertTo-Json -Depth 6

if (-not $Salida) {
  $serieArchivo = ("$($equipo.serie)" -replace '[^A-Za-z0-9-]', '')
  if (-not $serieArchivo) { $serieArchivo = $env:COMPUTERNAME }
  $Salida = Join-Path ([Environment]::GetFolderPath('Desktop')) ('diagnostico-{0}-{1}.json' -f $serieArchivo, (Get-Date -Format 'yyyyMMdd-HHmm'))
}
[IO.File]::WriteAllText($Salida, $json, (New-Object System.Text.UTF8Encoding $false))

$copiado = $false
if (-not $SinPortapapeles) {
  try { Set-Clipboard -Value $json -ErrorAction Stop; $copiado = $true } catch { $copiado = $false }
}

Write-Host "  Listo: $Salida" -ForegroundColor Green
if ($copiado) { Write-Host '  También quedó copiado: en la ficha, usa "Importar diagnóstico" y pégalo.' }
foreach ($a in $avisos) { Write-Host "  Aviso: $a" -ForegroundColor Yellow }
Write-Host ''

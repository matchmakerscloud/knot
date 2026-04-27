# Cloudflare token — agregar Email Routing scope correctamente

## Diagnóstico actual

```bash
$ curl /zones?name=matchmakers.cloud
permissions: #dns_records:edit, #dns_records:read, #zone_settings:read, #zone_settings:edit, #zone:read

$ curl /accounts
result: []   # ← VACÍO. El token no tiene Account-level access.
```

**Email Routing es un recurso a nivel Account, no Zone.** Por eso, aunque agregaste un scope al token, sigue sin verse.

## La solución (60s)

Ir a https://dash.cloudflare.com/profile/api-tokens

### Si el token actual ya existe — Editar

1. Click en el token → **Edit**
2. En "Permissions" agregar **DOS nuevas filas**:
   - **Account** | Email Routing Addresses | Edit
   - **Account** | Email Routing Rules | Edit
3. En "Account Resources" cambiar a:
   - **Include** | All accounts (o **Specific account** | el tuyo)
4. **Continue to summary** → **Save**

### Importante

Si CF te dice *"This token is not editable"* (algunos legacy tokens no son editables), **CREA UNO NUEVO** con todos estos scopes:

| Section | Permission | Access |
|---|---|---|
| Account | Email Routing Addresses | Edit |
| Account | Email Routing Rules | Edit |
| Zone | DNS | Edit |
| Zone | Zone Settings | Edit |
| Zone | Zone | Read |

**Resources:**
- Account Resources: Include — All accounts
- Zone Resources: Include — All zones

Click **Continue to summary** → **Create Token** → copia el token nuevo.

## Pegarme el token

En `/home/feres/.env`, edita la línea:

```
cloudflare = <NUEVO_TOKEN>
```

Yo lo detecto y proceed con activar Email Routing en una sola línea.

## Lo que voy a hacer apenas tenga el token bueno

```bash
ACCOUNT_ID=$(curl ... /accounts ... | jq -r '.result[0].id')
ZONE_ID=0146af38573a9683d6ef3e2cb1815de6

# 1. Habilitar Email Routing
curl -X POST .../zones/$ZONE_ID/email/routing/enable

# 2. Agregar destination address (a tu Proton)
curl -X POST .../accounts/$ACCOUNT_ID/email/routing/addresses \
  -d '{"email":"matchmakercloud@proton.me"}'

# CF envía email de verificación → tú clickeas el link en Proton inbox

# 3. Catch-all rule: *@matchmakers.cloud → Proton
curl -X POST .../zones/$ZONE_ID/email/routing/rules/catch_all \
  -d '{
    "actions":[{"type":"forward","value":["matchmakercloud@proton.me"]}],
    "matchers":[{"type":"all"}],
    "enabled":true
  }'

# 4. CF auto-añade los MX records correctos
```

Total: 4 llamadas API + 1 click tuyo en el link de verificación que llegará a tu Proton.

## Single click pendiente tuyo (después)

Cuando CF te envía el email de verificación a `matchmakercloud@proton.me`, abres tu Proton (vía web en proton.me/login con tu password) y clickeas el link del email "Cloudflare email verification".

Después de eso: **`*@matchmakers.cloud` llega a tu Proton inbox**, incluyendo `security@`, `conduct@`, `hello@`, etc.

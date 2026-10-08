# Módulo de selección de objetivos — Droide YVH

Endpoint HTTP que decide cuál es el siguiente objetivo a destruir a partir de la
lectura del módulo de visión, más un sistema de auditoría persistente para
revisar el histórico de cálculos.

**Stack:** Express · TypeScript · MongoDB

---

## 1. Requisitos

- Node.js >= 20 (probado con Node 24)
- MongoDB (local, o Docker)
- `curl` (para los tests oficiales)

## 2. Instalación

```bash
npm install
cp .env.example .env   # opcional: los valores por defecto ya funcionan
```

## 3. Base de datos

Con Docker (recomendado) — levanta **Mongo y la aplicación**:

```bash
docker compose up -d
```

O con un MongoDB local escuchando en `mongodb://localhost:27017`.

La base de datos por defecto es `yvh` y se puede cambiar con `MONGO_URI`. Los
puertos publicados en el host son configurables: `MONGO_HOST_PORT` (27017) y
`APP_HOST_PORT` (8888).

## 4. Ejecución

Con Docker Compose (todo el stack):

```bash
docker compose up -d
```

En local, desarrollo (recarga en caliente):

```bash
npm run dev
```

En local, producción:

```bash
npm run build
npm start
```

El servidor escucha en **http://localhost:8888** (`PORT` configurable). El puerto
8888 es el que usa la suite oficial de tests, por eso es el valor por defecto.

El nivel de log se controla con `LOG_LEVEL` (`debug | info | warn | error`, por
defecto `info`). Con `debug` se ve la traza del pipeline: rango, filtros,
selector y persistencia.

## 5. Endpoints

### `POST /radar`

Recibe la lectura del radar y devuelve las coordenadas del siguiente objetivo.

```bash
curl -s -X POST http://localhost:8888/radar \
  -H 'Content-Type: application/json' \
  -d '{
    "protocols": ["avoid-mech"],
    "scan": [
      { "coordinates": { "x": 0, "y": 40 }, "enemies": { "type": "soldier", "number": 10 } },
      { "coordinates": { "x": 0, "y": 80 }, "allies": 5, "enemies": { "type": "mech", "number": 1 } }
    ]
  }'
# => {"x":0,"y":40}
```

Cada evaluación queda registrada para auditoría.

### Auditoría

| Método   | Ruta          | Descripción                          |
| -------- | ------------- | ------------------------------------ |
| `GET`    | `/audit`      | Listado de las últimas interacciones (`?limit=`, por defecto 50, máximo 200) |
| `GET`    | `/audit/:id`  | Detalle de una interacción            |
| `DELETE` | `/audit/:id`  | Borra una interacción                 |

También existe `GET /health` como sonda de vida.

## 6. Scripts de auditoría

Se incluyen tres scripts de conveniencia sobre la API:

```bash
./scripts/audit-list.sh              # listado
./scripts/audit-get.sh <id>          # detalle
./scripts/audit-delete.sh <id>       # borrado
```

El destino se puede sobreescribir con `API_URL`:

```bash
API_URL=http://otro-host:8888 ./scripts/audit-list.sh
```

## 7. Tests oficiales

Con el servidor levantado en el puerto 8888:

```bash
./tests.sh        # o: sh ./tests.sh
```

Si al descomprimir no se conservan los permisos, corré `sh ./tests.sh` (o
restaurá el bit con `chmod +x tests.sh scripts/*.sh`).

Resultado esperado: `Test 1` … `Test 13` en `[ OK ]`.

Para depurar un caso suelto sin tocar el fichero oficial:

```bash
./scripts/run-test.sh 3       # un caso
./scripts/run-test.sh all     # todos, con detalle
```

Colección Postman generada desde `test_cases.txt` (un request y su aserción por
caso):

```bash
node scripts/generate-postman-collection.mjs
# -> postman/yvh-targeting.postman_collection.json
```

## 8. Tests

La función de decisión (`decideTarget`) es pura y se prueba sin base de datos ni
HTTP. Además, la app completa (rutas, validación, auditoría) se prueba con
`supertest` contra un repositorio de auditoría **en memoria**, sin necesidad de
Mongo. La suite reutiliza el `test_cases.txt` oficial como casos de prueba.

```bash
npm test
```

- `src/domain/decide-target.test.ts`: 26 tests unitarios del algoritmo (incluye
  la traza de `explainDecision`).
- `src/http/app.test.ts`: 27 tests de integración HTTP (incluye los 13 casos
  oficiales servidos por HTTP, validación 400, protocolo desconocido, 404 JSON,
  borrado 204 y el límite de `/audit`).
- `src/config/logger.test.ts`: 3 tests del logger (niveles y envío a stderr).

Total: **56 tests**.

## 9. Estructura

```
src/
  domain/                 Lógica pura (sin framework ni DB)
    types.ts              Tipos del dominio
    audit-record.ts       Tipos + puerto AuditRepository (independiente de Mongo)
    geometry.ts           Distancia y alcance máximo
    decide-target.ts      Pipeline de decisión
    protocols/
      protocol.ts         Contratos FilterProtocol / SelectorProtocol
      filters/            avoid-mech, avoid-crossfire, prioritize-mech, assist-allies
      selectors/          closest-enemies, furthest-enemies
      registry.ts         Catálogo y orden de aplicación de protocolos
  models/                 Esquema Mongoose de auditoría
  repositories/           Adaptador Mongo del puerto de auditoría
  services/               Orquestación (decisión + persistencia)
  validation/             Esquemas zod de entrada
  http/                   App Express, controladores, DTOs y middlewares (errores, request-logger)
  config/                 Variables de entorno y logger
  db/                     Conexión a MongoDB
  index.ts                Arranque y apagado ordenado
scripts/                  Auditoría, runner de un caso y generador de Postman
postman/                  Colección Postman generada desde test_cases.txt
visual/                   Diagramas HTML (estrategia, pipeline, tests en el plano)
Dockerfile                Imagen multi-stage de la aplicación
docker-compose.yml        Stack completo (Mongo + app)
tests.sh                  Suite oficial
test_cases.txt            Casos oficiales
```

## 10. Decisiones de diseño

- **Protocolos como estrategias enchufables.** Añadir un protocolo nuevo es
  añadir una clase y registrarla; no hay ramas `if/switch` por protocolo.
- **Los filtros corren siempre antes del selector**, sin importar el orden en
  que lleguen en `protocols`. Así `["closest-enemies","avoid-mech"]` y
  `["avoid-mech","closest-enemies"]` se comportan igual.
- **Distancia al cuadrado.** Se compara `x² + y²` contra `100²` para evitar
  `sqrt` y errores de coma flotante. El corte de 100 m se aplica siempre.
- **Sin objetivo válido → `200` con cuerpo `null`.** El escaneo se procesó
  correctamente; simplemente no hay nada que atacar. Caso no cubierto por los
  tests oficiales, documentado aquí como decisión explícita.
- **Los protocolos desconocidos se rechazan con `400`.** En un sistema crítico no
  me vale ignorarlos en silencio: un `avoid-crossfire` mal escrito podría hacer
  que el droide dispare a aliados. La frontera HTTP valida contra el catálogo
  antes de decidir.
- **`allies` ausente equivale a 0** y `protocols` puede venir como string o
  como lista.
- **Los puntos sin enemigos se ignoran** (`enemies.number <= 0`): no hay nada que
  atacar. Igual que el corte de 100 m, es un filtro global previo a los
  protocolos.
- **`GET /audit` está acotado.** Devuelve las últimas 50 interacciones por
  defecto y admite `?limit=` (máximo 200) para no hacer crecer la respuesta sin
  control en un histórico grande.
- **Rutas desconocidas devuelven `404` en JSON** y `X-Powered-By` está
  deshabilitado: la API no filtra el framework ni responde HTML.
- **El puerto de auditoría no filtra Mongoose.** El dominio define `AuditRecord`
  y `AuditRepository`; el adaptador de Mongo es el único que conoce Mongoose.
  Esto permite testear el HTTP con un repositorio en memoria y cambiar de
  tecnología de persistencia sin tocar los controladores.
- **La decisión no depende de la base de datos.** `decideTarget` es pura; el
  servicio solo la conecta con la persistencia. La auditoría se escribe antes de
  responder (fail-closed): si no se puede auditar, la petición no se da por
  buena.

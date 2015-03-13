# API SDK

### Usage

```
const api = new API(root, globalConfig);

api.PATH⁰..PATHⁿ.method(currentConfig);
```

* **root** is the root path of api, default '/'
* **globalConfig** is global config for all invokes
* **currentConfig** is current config for current invoke
* **PATH⁰..PATHⁿ** is request path of api
* **method** is one of HTTP methods

---

* **config** is the parameter of fetch api
* **config.credentials** is defaultly 'include'


### Examples

```js
import API from 'apisdk';

const api = new API('http://127.0.0.1');

/* GET http://127.0.0.1/path1/path2 */
let $result = api.path1.path2.get();
```

```js
import API from 'apisdk';

const api = new API();

/* POST /path1/path2 HTTP/1.1 */
let $result = api.path1.path2.post({ body: 'a=1&b=2' });
```

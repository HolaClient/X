/**
 *--------------------------------------------------------------------------
 *  _    _       _        _____ _ _            _  __   __
 * | |  | |     | |      / ____| (_)          | | \ \ / /
 * | |__| | ___ | | __ _| |    | |_  ___ _ __ | |_ \ V / 
 * |  __  |/ _ \| |/ _` | |    | | |/ _ \ '_ \| __| > <  
 * | |  | | (_) | | (_| | |____| | |  __/ | | | |_ / . \ 
 * |_|  |_|\___/|_|\__,_|\_____|_|_|\___|_| |_|\__/_/ \_\
 *--------------------------------------------------------------------------
 *
 * https://holaclientx.tech
 * https://github.com/HolaClient/X
 * https://discord.gg/CvqRH9TrYK
 * 
 * @author CR072 <crazymath072.tech>
 * @copyright 2022-2024 HolaClient
 * @version 1
 *
 *--------------------------------------------------------------------------
 * router.js - Endpoints handler.
 *--------------------------------------------------------------------------
*/
module.exports = async function () {
    /**
     *--------------------------------------------------------------------------
     * Loading static endpoints
     *--------------------------------------------------------------------------
    */
    app.static('/assets', path.join(__dirname, '..', '..', 'public'));
    app.static('/cdn', path.join(__dirname, '..', '..', 'storage', 'cdn'));
    app.use('/robots.txt', (req, res, next) => { fs.readFile(path.join(__dirname, '..', '..', 'public', 'robots.txt'), 'utf8', (err, data) => { if (err) { res.end(err); } else { res.end(data); } }); });
    app.use('/manifest.json', (req, res, next) => { fs.readFile(path.join(__dirname, '..', '..', 'public', 'manifest.json'), 'utf8', (err, data) => { if (err) { res.end(err); } else { res.end(data); } }); });
    app.use(async (req, res, next) => {
        try {
            const blacklist = await db.get("punishments", "blacklist") || {};
            if (blacklist && blacklist.ip && blacklist.ip.includes(req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.headers['x-client-ip'] || req.headers['x-forwarded'] || req.ip || req.socket.remoteAddress)) return page.error("blacklisted", req, res)
            if (blacklist.countries && blacklist.countries.length > 0 && blacklist.countries.includes(geoip.lookup(req.ip)?.country)) {
                res.status(403)
                return res.end(fallback.errorBlacklisted());
            }
            return next();
        } catch (error) {
            System.err.println(error)
            return next();
        }
    });
    /**
    *--------------------------------------------------------------------------
    * Handleing the root route
    *--------------------------------------------------------------------------
    */
    app.all("*", async (req, res) => {
        try {
            const appearance = await db.get("settings", "appearance") || {};
            const permissions = await db.get("settings", "permissions") || {};
            if (process.env.APP_MAINTENANCE == "true") return page.error("maintenance", req, res);
            if (!req.session.userinfo && hcx.core.cookies.get(req, "hc.sk")) {
                let a = JSON.parse(hcx.core.cookies.get(req, "hc.sk"))
                let b = await db.get("users", a.user)
                if (b) {
                    let c = crypt.decrypt(a, b.sessions.secret)
                    if (c && c === b.sessions.key) req.session.userinfo = b
                }
            }
            await render();
            async function render() {
                const a = permissions.auth?.routes || require('../../app/config/permissions.json').auth.routes;
                const b = permissions.landing?.routes || require('../../app/config/permissions.json').landing.routes;
                const c = permissions.layouts?.routes || require('../../app/config/permissions.json').layouts.routes;
                const d = permissions.admin?.routes || require('../../app/config/permissions.json').admin.routes;
                const e = [
                    { name: "auth", routes: a },
                    { name: "landing", routes: b },
                    { name: "layouts", routes: c },
                    { name: "admin", routes: d }
                ];
                const f = await Promise.all(e.map(async ({ name, routes }) => {
                    let l
                    if (req.url == "/") { l = "/" } else if (req.url.endsWith("/")) { l = req.url.slice(0, -1) } else { l = req.url };
                    const g = routes.find(h => h.route == l);
                    if (g) {
                        await r(name, g);
                        return true;
                    }
                    return false;
                }));
                if (!f.includes(true)) return
            }
            async function r(f, i) {
                if (i.requireAuth === true && !req.session.userinfo) return res.redirect('/login')
                let s;
                if (req.session.userinfo) s = await db.get("permissions", req.session?.userinfo?.id);
                if (s && i && parseInt(i.permission) > parseInt(s.level)) return res.html(fallback.error403());
                if (!s && i && parseInt(i.permission) !== 0) return res.html(fallback.error401());
                return await pages.render(req, res, `./resources/views/${f}/${appearance.themes && appearance.themes[f] || "default"}/${i.path}`);
            }
            return pages.render(req, res, `./resources/views/errors/404.ejs`);
        } catch (e) {
            System.err.println(e);
            res.end(fallback.error500(e));
        }
    });
}
/**
*--------------------------------------------------------------------------
* End of the file
*--------------------------------------------------------------------------
*/
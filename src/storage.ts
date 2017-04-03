import  types=require("./types")
import  meta=require("./metaKeys")
import  cb=require("./collectionBindings")
import request=require("superagent")
import {isNullOrUndefined} from "util";
import {Binding, Thenable} from "./types";
export enum ParameterLocation{
    URL, QUERY, HEADER, BODY, FORM
}
export interface RequestParameter {
    name: string
    location: ParameterLocation,
    value: any
}
export interface Request {
    url: string,
    method: string
    parameters: RequestParameter[]
    auth?: {
        user: string,
        password: string,
    }
}
const isBrowser = typeof window !== 'undefined';




class BasicThenable implements types.Thenable {

    cb: (error: any, v: any, extra: any) => void;

    then(f: (error: any, ev: any, extra: any) => void) {
        this.cb = f;
    }
}
class AllThenable extends BasicThenable {

    map: Map<types.Thenable,any> = new Map();

    constructor(private all: types.Thenable[]) {
        super();
        all.forEach(x => x.then((e, v, extra) => {
            this.map.set(x, [e, v, extra]);
            if (this.map.size == all.length) {
                var result = [];
                var error = null;
                this.map.forEach((v, k) => {
                    var m: [any, any, any] = v;
                    result.push([k, v[1]]);
                    if (v[0]) {
                        error = v;
                    }
                })
                this.cb(error, result, null);
            }
        }))
    }
}
function all(b: types.Thenable[]): Thenable {
    return new AllThenable(b);
}
function parameterize(r: Request, name: string, v: any): Request {
    var rs = {
        url: r.url,
        method: r.method,
        parameters: r.parameters.map(x => {
            if (x.name == name) {
                return {
                    name: x.name,
                    location: x.location,
                    value: v
                }
            }
            else {
                return x;
            }
        })
    }
    return rs;
}
function getLocation(v: string) {
    if (v == "query") {
        return ParameterLocation.QUERY;
    }
    else if (v == "uri") {
        return ParameterLocation.URL;
    }
    else if (v == "headers") {
        return ParameterLocation.HEADER;
    }
    else if (v === "body") {
        return ParameterLocation.BODY;
    }
}
function parameterizeBinding(r: Request, b: types.Binding[]): Request {
    var rs = {
        url: r.url,
        method: r.method,
        parameters: r.parameters.concat(b.map(x => {
            var val = x.get();
            if (x.type().collectionFormat) {
                if (Array.isArray(val) && x.type().collectionFormat == "csv") {
                    val = val.join(",");
                }
            }
            return {
                name: x._id,
                location: getLocation((<types.metakeys.WebCollection>x.type()).location),
                value: val
            }
        }))

    }

    return rs;
}
export interface Link {
    link: string,
    rel: string
}
export function linkHeadersParser(lp: string): Link[] {
    lp = lp.substring(1);
    var headers = lp.split(`", <`);
    return headers.map(x => {
        var ri = x.lastIndexOf(';');
        var link = x.substring(0, ri - 1);

        var rel = x.substring(x.lastIndexOf('=') + 2);
        return {
            link: link,
            rel: rel
        }
    })
}
class RequestExecutor {

    execute(r: Request): types.Thenable {
        var url = r.url;
        r.parameters.forEach(x => {
            if (x.location == ParameterLocation.URL) {

                var pm = "{" + x.name + "}";
                var i = url.indexOf(pm);
                if (i != -1) {
                    var c = x.value;
                    if (!c) {
                        c = "";
                    }
                    url = url.substring(0, i) + c + url.substring(i + pm.length);
                }
            }
        })
        var rr = request(r.method.toUpperCase(), url);
        r.parameters.forEach(x => {
            if (x.location == ParameterLocation.QUERY) {
                var c: any = {};
                if (x.value) {
                    c[x.name] = x.value;
                    rr = rr.query(c);
                }
            }
            if (x.location == ParameterLocation.HEADER) {
                if (x.value) {
                    rr = rr.set(x.name, x.value);
                }
            }
            if (x.location == ParameterLocation.BODY) {
                if (x.value) {
                    rr = rr.send(x.value);
                }
            }
        })
        if (r.auth) {
            rr.auth(r.auth.user, r.auth.password);
        }
        rr = rr.query({"$timestamp": "" + new Date().getMilliseconds()})

        //rr.set("Cache-Control","max-age=0")
        var result = new BasicThenable();

        rr.end((err: any, res: request.Response) => {
            if (res) {
                var body = res.body;
                //console.log("Completed")
                if (result.cb) {
                    result.cb(err, body, res);
                }
            }
            else{
                if (result.cb) {
                    result.cb(err, null, {});
                }
            }
        })
        return result;
    }
}
class OperationInfo {

    template: Request;
    errorMessage: string

    constructor(t: types.Operation&any) {
        var req: Request = {
            method: t.method ? t.method.toUpperCase() : "GET",
            url: t.location,
            parameters: []
        }
        if (!req.url) {
            if (t.url && t.baseUri) {
                req.url = t.baseUri + t.url.substring(1);
            }
        }
        this.template = req;
    }
}

class PagedCollectionInfo extends OperationInfo {


    pageParameterName: string

    itemsPerPageParameterName: string

    itemsValueField: string;

    totalValueField: string;

    offsetField: string

    pagesStartFromZero: boolean


    constructor(t: meta.WebCollection) {
        super(t);
        this.pageParameterName = t.pageNumberPointer;
        this.totalValueField = t.total;
        this.itemsValueField = t.results;
        this.pagesStartFromZero = t.pagesStartFromZero;
        this.errorMessage = t.errorIn;
        var method = t.method;
        var pb = (<any>t).basicPaging;
        if (pb) {
            this.totalValueField = pb.total;
            this.itemsValueField = pb.results;
            this.offsetField=pb.offset;
            this.pageParameterName = pb.page;
        }
        if (!t.errorIn) {
            this.errorMessage = (<any>t).errorMessageIn;
        }
        var req: Request = {
            method: method ? method.toUpperCase() : "GET",
            url: t.location,
            parameters: [{location: ParameterLocation.QUERY, name: this.pageParameterName, value: null}]
        }
        if (this.offsetField) {
            var req: Request = {
                method: method ? method.toUpperCase() : "GET",
                url: t.location,
                parameters: [{location: ParameterLocation.QUERY, name: this.offsetField, value: null}]
            }
        }
        if (!req.url) {
            if (t.url && t.baseUri) {
                req.url = t.baseUri + t.url.substring(1);
            }
        }
        this.template = req;
    }

    getPage(num: number, itemsPerPage?: number, pbnds: types.Binding[] = []): Request {
        if (!this.pagesStartFromZero) {
            num = num + 1;
        }
        var withPage:Request = null;
        if (this.offsetField){
            withPage=parameterize(this.template, this.offsetField, (num-1)*itemsPerPage);
        }
        else {
            withPage = parameterize(this.template, this.pageParameterName, num);
        }

        if (itemsPerPage && this.itemsPerPageParameterName) {
            withPage = parameterize(withPage, this.itemsPerPageParameterName, itemsPerPage);
        }

        withPage = parameterizeBinding(withPage, pbnds);

        return withPage;
    }
}
export interface IAuthService {

    needsAuth(b: types.IBinding): boolean;
    patchRequest(b: types.IBinding, r: Request);
    authError(b: types.IBinding)
}
export const authServiceHolder = {
    service: null
}

export function setAuthServive(c: IAuthService) {
    authServiceHolder.service = c;
}

export class RESTAccessControl extends types.DefaultAccessControl<PagedCollection> {

    needsAuthentification() {
        var tp = this.binding.type();
        if (authServiceHolder.service) {
            return authServiceHolder.service.needsAuth(this.binding);
        }
        if (needsAuthentification(<types.Operation>tp)) {
            return true;
        }
        return false;
    }

    supportsAdd(): boolean {
        return this.binding.addOperation() != null;
    }

    supportsRemove(): boolean {
        return this.binding.removeOperation() != null;
    }

    supportsUpdate() {
        return this.binding.updateOperation() != null;
    }

    canEditSelf(): boolean {
        return this.supportsUpdate();
    }

    canAddItem(t?: any): boolean {
        return true;
    }

    canRemoveItem(t?: any): boolean {
        return true;
    }

    canEditItem(t?: any): boolean {
        return this.binding.updateOperation() != null;
    }
}

export abstract class PagedCollection extends types.ViewBinding {

    abstract  total(): number

    abstract requestPage(num: number);

    abstract pageNum(): number

    abstract addOperation(): types.Operation;

    abstract removeOperation(): types.Operation;

    abstract updateOperation(): types.Operation;

    abstract  pageCount(): number
}

function needsAuthentification(ts: types.Operation) {
    if (ts.securedBy) {
        if (ts.securedBy.length > 0) {
            return ts.securedBy[0]
        }
    }
}
export class UpdatingArrayBinding extends cb.ArrayCollectionBinding {

    updater: types.Operation;

    constructor(private p: BasicPagedCollection) {
        super(p);
        this.updater = p.updateOperation();
    }

    createSelectionBinding() {
        var selBind = super.createSelectionBinding();
        selBind._autoCommit = false;
        return selBind;
    }


    replace(oldValue: any, newValue: any) {
        super.replace(oldValue, newValue);
        var toUpdate = new types.OperationBinding(this.updater, this.pb);
        var bb = new Binding("context");
        bb.set(oldValue);
        bb._type = this.componentType();
        toUpdate.context = bb;
        this.p.lastRevision++;
        var ll = this.p.lastRevision;
        toUpdate.set(newValue);
        toUpdate.execute((x) => {
            if (this.p.lastRevision == ll) {
                this.p.request();
            }
        })
    }

    postApplySelection() {

    }

    applyChangedElement(e: any) {
        this.replace(e, e);
    }
}
function getQueryVariable(query: string, variable) {
    query = query.substring(query.indexOf('?') + 1)
    var vars = query.split('&');
    for (var i = 0; i < vars.length; i++) {
        var pair = vars[i].split('=');
        if (decodeURIComponent(pair[0]) == variable) {
            return decodeURIComponent(pair[1]);
        }
    }
    return null;
}
export const RESULTS_TO_DOWNLOAD = 600;
export class BasicPagedCollection extends PagedCollection {

    private info: PagedCollectionInfo

    private executor: RequestExecutor = new RequestExecutor();

    protected totalResults: number

    protected itemsPerPage: number=0;

    protected currentPageNum = 0;

    request() {
        this.requestPage(this.currentPageNum);
    }

    lastRevision = 0;

    protected adder: types.Operation;
    protected remover: types.Operation;
    protected updater: types.Operation;




    addOperation(): types.Operation {
        return this.adder
    }

    removeOperation(): types.Operation {
        return this.remover;
    }

    updateOperation(): types.Operation {
        return this.updater;
    }

    accessControl() {
        return new RESTAccessControl(this);
    }

    innerParametersChanged() {
        this.currentPageNum = 0;
        super.innerParametersChanged();
    }

    protected _isLoading: boolean

    protected dynamicUrl: boolean

    constructor(id: string, t: meta.WebCollection, private g: types.IGraphPoint) {
        super(id);
        this.info = new PagedCollectionInfo(t);
        this._type = <types.Type>t;
        var cp = types.service.componentType(<types.Type>t);
        var constructors = types.service.constructors(cp);
        if (constructors.length > 0) {
            this.adder = constructors[0];
        }
        var updaters = types.service.updaters(cp);
        if (updaters.length > 0) {
            this.updater = updaters[0];//
        }
        if (!this.info.template.url) {
            if (g.get()) {
                this.info.template.url = g.get()[id];
            }
            this.dynamicUrl = true;
        }
    }

    all() {
        //FIXME
        return this.collectionBinding().workingCopy();
    }

    refresh() {
        if (this.dynamicUrl && this.g.get()) {
            var vs = this.g.get()[this.id()];
            if (vs != this.info.template.url) {
                this.info.template.url = vs;
                this.value = null;
                //super.refresh();
                this.changed();
            }
        }
        //super.refresh();
    }

    createCollectionBinding(): types.CollectionBinding {
        if (this.updater) {
            return new UpdatingArrayBinding(this);
        }
        return super.createCollectionBinding();
    }

    total() {
        return this.totalResults;
    }

    changed() {
        this.listeners.forEach(x => x.valueChanged(null))
    }

    isLoading() {
        if (this.info.template.url) {
            return this._isLoading;
        }
        return false;
    }

    hasResults() {
        return !isNullOrUndefined(this.value)
    }

    error: boolean;
    _errorMessage: string

    errorMessage() {
        var ps = this.parameterStatus().valid;
        if (!ps) {
            return this.parameterStatus().message;
        }
        return this._errorMessage;
    }

    isError() {
        return this.error;
    }

    canRetry() {
        return this.parameterStatus().valid;
    }

    clearError() {
        this.error = false;
        this.value = null;
        this.authError = false;
        this.changed();
    }

    authError: boolean;

    errorKind() {
        if (this.authError) {
            return "auth";
        }
        return null;
    }

    _canSortLocally = false;

    hasAllData() {
        return this._canSortLocally;
    }

    requestPage(num: number) {
        if (!this._isLoading) {
            this._isLoading = true;
            this.currentPageNum = num;
            this.changed();
        }
        //all parameters
        var lr = this.info.getPage(num, this.itemsPerPage, this.allParameterBindings());//all storage
        lr=this.patchAuth(lr);

        var q = this.lastRevision;
        this.executor.execute(lr).then((err, x, extra) => {
            if (this.lastRevision != q) {
                return;
            }
            if (err) {
                if (err.status == 401 || err.status == 403) {
                    this.authError = true;
                    authServiceHolder.service.authError(this, lr);
                }
                this.error = true;
                if (err.status) {
                    this._errorMessage = err.status + " " + err.message;
                }
                if (this.info.errorMessage) {
                    if (x) {
                        this._errorMessage = x[this.info.errorMessage]
                    }
                }
                this._isLoading=false;
                this.changed();
                return;
            }
            if (this.info.itemsValueField) {
                this.value = x[this.info.itemsValueField];
            }
            else {
                this.value = x;
            }
            this._pageCount = -1
            if (this.info.totalValueField) {
                this.totalResults = x[this.info.totalValueField];
            }
            else {
                if (extra.links) {
                    var lastUrl = extra.links.last;
                    var firstUrl = extra.links.first;

                    if (lastUrl) {
                        var maxPage = getQueryVariable(lastUrl, this.info.pageParameterName);
                        if (maxPage) {
                            this._pageCount = parseInt(maxPage);
                            this.totalResults = -1;
                        }
                    }
                    else if (firstUrl) {
                        this._pageCount = this.currentPageNum + 1;
                        this.totalResults = -1;
                    }
                    else {
                        this.totalResults = this.value.length;
                    }

                    //console.log(extra.links);
                }
                else {
                    this.totalResults = this.value.length;
                }
            }
            if (this.itemsPerPage==0) {
                this.itemsPerPage = this.value.length;
            }
            if (this.shouldGetAll()) {
                this.requestAll().then((e, v) => {
                    if (!e) {
                        this.value = v;
                        this.totalResults = v.length;
                        this._isLoading = false;
                        this._canSortLocally = true;
                        if (this._cb) {
                            this._cb.refresh();
                            //refresh cb
                        }
                        this.changed();
                    }
                });
                this._canSortLocally = false;
                this.totalResults = this.value.length;
                //return;
            }
            else {
                if (this.pageCount() == 1 || (this.value && this.totalResults == this.value.length)) {
                    this._canSortLocally = true;
                }
                else {
                    this._canSortLocally = false;
                }
            }

            if (this._cb) {
                this._cb.refresh();
            }
            this._isLoading = false;
            this.changed();
        });
    }

    shouldGetAll() {
        if (this.collectionBinding().groupBy()||(this._pageCount > 1 && this.value.length * this._pageCount < RESULTS_TO_DOWNLOAD) ||
            (this.totalResults > 0 && this.value && this.totalResults != this.value.length && this.totalResults < RESULTS_TO_DOWNLOAD)) {
            return true;
        }
        return false;
    }

    requestAll(): types.Thenable {
        var components: types.Thenable[] = [];
        var thenableResults = [];
        for (var i = 0; i < this.pageCount(); i++) {
            var lr = this.info.getPage(i, this.itemsPerPage, this.allParameterBindings());//all storage
            lr = this.patchAuth(lr);
            var ir = this.executor.execute(lr);
            (<any>ir).index = i;
            components.push(ir);
        }
        var allReady = new BasicThenable();
        all(components).then((e, v) => {
            var x: any[][] = v;
            x.forEach(val => {
                var vv=val[1];
                if (this.info.itemsValueField) {
                   vv = vv[this.info.itemsValueField];
                }
                thenableResults[val[0].index] = vv;
            })
            var allResults: any[] = []
            thenableResults.forEach(r => {
                allResults = allResults.concat(r);
            })
            if (allReady.cb) {
                allReady.cb(null, allResults, null);
            }
            //console.log(allResults);
        });
        return allReady;
    }

    protected patchAuth(lr: Request) {
        if (authServiceHolder.service) {
            lr = authServiceHolder.service.patchRequest(this, lr);
        }
        return lr;
    }

    _pageCount: number = -1;

    get(): any[] {
        if (!this.info.template.url) {
            return [];
        }
        if (!this.parameterStatus().valid) {
            this.error = true;
            return []
        }
        if (this.auth()) {
            return [];
        }
        if (this.error) {
            return [];
        }
        if (this.value) {
            return this.value;
        }
        if (this._isLoading) {
            return [];
        }
        this.requestPage(this.currentPageNum);
    }

    protected auth() {
        return this.accessControl().needsAuthentification();
    }

    set(v: any) {

    }

    pageNum() {
        return this.currentPageNum;
    }

    pageCount(): number {
        if (this._pageCount != -1) {
            return this._pageCount;
        }
        if (this.totalResults) {
            let vl = this.totalResults / this.itemsPerPage;
            if (this.totalResults % this.itemsPerPage != 0) {
                return vl + 1;
            }
            return vl;
        }
        return 0;
    }
}
types.service.registerExecutor("rest", {

    executeOperation(o: types.Operation, parameters: any, cb: (x: any) => void){

        var opInfo = new OperationInfo(o);
        o.parameters.forEach(x => {
            if (parameters[x.id]) {
                var l: ParameterLocation = ParameterLocation.QUERY
                if (x.location == "body") {
                    l = ParameterLocation.BODY;
                }
                if (x.location == "header") {
                    l = ParameterLocation.HEADER;
                }
                if (x.location == "uri") {
                    l = ParameterLocation.URL;
                }
                opInfo.template.parameters.push({
                    location: l,
                    name: x.id,
                    value: parameters[x.id],
                })
            }
        })
        var template = opInfo.template;
        var cm = new Binding(o.id);
        cm._type = o;

        if (authServiceHolder.service) {
            template = authServiceHolder.service.patchRequest(cm, template);
        }
        new RequestExecutor().execute(template).then((err, x) => {
            if (err) {
                // if (err.status == 401 || err.status == 403) {
                //     authError = true;
                //     authServiceHolder.service.authError(this, lr);
                // }
                // error = true;
                // if (err.status) {
                //     _errorMessage = err.status + " " + err.message;
                // }
                // if (info.errorMessage) {
                //     if (x) {
                //         _errorMessage = x[info.errorMessage]
                //     }
                // }
            }
            cb(x);
        });
    }
})

declare var $:any
if (isBrowser) {
    var JSONP = function (global) {
        // (C) WebReflection Essential - Mit Style
        // cleaned up by Brett Zamir for JSLint and avoiding additional globals and need for conventional [?&]callback= in URL)
        // 'use strict'; // Added above
        var id = 0,
            ns = 'MediaWikiJS',
            prefix = '__JSONP__',
            document = global.document,
            documentElement = document.documentElement;
        return function (uri, callback) {
            var src = prefix + id++,
                script = document.createElement('script'),
                JSONPResponse = function () {
                    try {
                        delete global[ns + "_" + src];
                    } catch (e) {
                        global[ns + "_" + src] = null;
                    }
                    documentElement.removeChild(script);
                    callback.apply(this, arguments);
                };
            window[ns + "_" + src] = JSONPResponse;
            //global[ns][src] = JSONPResponse;
            (<any>documentElement.insertBefore(
                script,
                documentElement.lastChild
            )).src = uri + (uri.indexOf('?') > -1 ? '&' : '?') + 'callback=' + ns + '_' + src;
        };
    }(window);
}

var cache:any={};
export class RemoteValueBinding extends Binding{

    private executor: RequestExecutor = new RequestExecutor();
    private loading:boolean;

    refresh(){
        this.buildRequest();
        super.refresh();
    }
    private cval;
    private url;
    buildRequest(){
        var url:string =this.parent().get("wikiURL");
        if (url) {
            var title = url.substring(url.lastIndexOf('/')+1);
            //console.log(title);

            if (title){
                var url="https://en.wikipedia.org/w/api.php/?format=json&action=query&prop=extracts&exintro=&explaintext=&titles="+title
                if (this.url==url){
                    return;
                }
                if (cache[url]){
                    this.url=url;
                    this.cval=cache[url];
                    return;
                }
                this.loading=true;
                JSONP(url,(x)=>{
                    var kk=Object.keys(x.query.pages)[0]
                    this.cval=x.query.pages[kk].extract;
                    this.url=url;
                    cache[url]=this.cval;
                    this.loading=false;
                    this.changed();
                })

            }
        }
    }

    isLoading(){
        return this.loading;
    }


    get(){
        this.buildRequest();
//
        return this.cval;
    }
}
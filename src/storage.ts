import  types=require("./types")
import  meta=require("./metaKeys")
import request=require("superagent")
import {isNullOrUndefined} from "util";
enum ParameterLocation{
    URL, QUERY, HEADER, BODY, FORM
}
interface RequestParameter {
    name: string
    location: ParameterLocation,
    value: any
}
interface Request {
    url: string,
    method: string
    parameters: RequestParameter[]
}


class BasicThenable implements types.Thenable {

    cb: (error:any,v: any) => void;

    then(f: (error:any,ev: any) => void) {
        this.cb = f;
    }
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
        var result = new BasicThenable();

        rr.end((err: any, res: request.Response) => {
            var body = res.body;
            console.log("Completed")
            if (result.cb) {
                result.cb(err,body);
            }
        })
        return result;
    }
}



class PagedCollectionInfo {

    template: Request;

    pageParameterName: string

    itemsPerPageParameterName: string

    itemsValueField: string;

    totalValueField: string;

    pagesStartFromZero:boolean

    errorMessage

    constructor(t: meta.WebCollection) {
        var req: Request = {
            method: "GET",
            url: t.location,
            parameters: [{location: ParameterLocation.QUERY, name: t.pageNumberPointer, value: null}]
        }
        this.template=req;
        this.pageParameterName=t.pageNumberPointer;
        this.totalValueField=t.total;
        this.itemsValueField=t.results;
        this.pagesStartFromZero=t.pagesStartFromZero;
        this.errorMessage=t.errorIn;
    }

    getPage(num: number, itemsPerPage?: number): Request {
        if (!this.pagesStartFromZero){
            num=num+1;
        }
        var withPage = parameterize(this.template, this.pageParameterName, num);

        if (itemsPerPage && this.itemsPerPageParameterName) {
            withPage = parameterize(withPage, this.itemsPerPageParameterName, itemsPerPage);
        }
        return withPage;
    }
}
export abstract class PagedCollection extends types.Binding{

    abstract  total() : number

    abstract requestPage(num: number);

    abstract pageNum() : number
}

export class BasicPagedCollection extends PagedCollection{

    private info: PagedCollectionInfo

    private executor: RequestExecutor = new RequestExecutor();

    protected totalResults: number

    protected itemsPerPage: number

    protected currentPageNum = 0;


    protected _isLoading: boolean

    protected dynamicUrl: boolean

    constructor(id: string,t:meta.WebCollection,private g:types.IGraphPoint){
        super(id);
        this.info=new PagedCollectionInfo(t);
        if (!this.info.template.url){
            if (g.get()) {
                this.info.template.url = g.get()[id];
            }
            this.dynamicUrl=true;
        }
    }
    refresh(){
        if (this.dynamicUrl){
            var vs=this.g.get()[this.id()];
            if (vs!=this.info.template.url){
                this.info.template.url=vs;
                this.value=null;
                //super.refresh();
                this.changed();
            }
        }
        //super.refresh();
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

    errorMessage(){
        return this._errorMessage;
    }

    isError(){
        return this.error;
    }
    clearError(){
        this.error=false;
        this.changed();
    }

    requestPage(num: number) {
        if (!this._isLoading) {
            this._isLoading = true;
            this.currentPageNum = num;
            this.changed();
        }
        var lr = this.info.getPage(num);
        this.executor.execute(lr).then((err,x) => {
            if (err) {
                this.error = true;
                if (err.status){
                    this._errorMessage=err.status+" "+err.message;
                }
                if (this.info.errorMessage){
                    if (x){
                        this._errorMessage=x[this.info.errorMessage]
                    }
                }
            }
            if (this.info.itemsValueField) {
                this.value = x[this.info.itemsValueField];
            }
            else{
                this.value=x;
            }
            this._cb=null;
            if (this.info.totalValueField) {
                this.totalResults = x[this.info.totalValueField];
            }
            else{
                this.totalResults= this.value.length;
            }
            this._isLoading = false;
            this.changed();
        });
    }

    get(): any[] {
        if (!this.info.template.url){
            return [];
        }
        if (this.error){
            return [];
        }
        if (this.value) {
            return this.value;
        }
        if (this._isLoading){
            return [];
        }
        this.requestPage(this.currentPageNum);
    }
    set(v:any){

    }
    pageNum(){
        return this.currentPageNum;
    }

    pageCount(): number {
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
export interface KeyName {
    keyName: string;
    keyDescription: string
}

export interface VisibleProperties {
    visibleProperties?: string[]
    hiddenProperties?: string[];
}

export interface PropertyGroups {
    propertyGroups?:{[name:string]:string[]}
}
export interface needsOwnGroup{
    needsOwnGroup?:boolean
}
export interface Label{
    label?: string | ((v:any)=>string)
    htmlLabel?:boolean
    cellSize?: number
}
export interface OrderingMapping{
    property?: string
    descending?: boolean
}
export interface OrderingMappings{
    [name:string]: string |OrderingMapping
}
export interface Ordering{
    ordering?:OrderingMappings
    sortDirection?: boolean
}
export interface Filter{
    filter?: FilterDescription
}
export interface NilInstance{
    NilInstance?: any
}
export interface FilterDescription{
    property?:string
    valueMappings?:{ [name:string]:string}
    noFilterValue?: string
    op?: string

}
export interface ParametersLayout{

    parametersLayout?:{
        initiallyVisible?: string[]
        allowConfiguration?: boolean
        contributeToContextMenu?: boolean
    }
}
export interface GroupBy{
    groupBy?: {
        property?: string
        allowUserConfiguration?: boolean
        allowedGropings?: string[]
    }
}

export interface HasComparator{
    compareFunction?(v0:any,v1:any):number
}
export interface KeyProp{
    keyProp?: string
}
export interface Reference{
    reference?:boolean
}
export interface Key{
    key?: boolean
}
export interface Icon{
    icon?:string
    defaultIcon?:string
}

export interface TreeProp{
    children?: string | string[]
}
export interface GroupBy{
    defaultGroupBy?:string
    possibleGroupings?: string[]
}

export interface LabelDecorator{
    when: string
    title?: string
    details?: string
    status?: string
    image?: string
    replace?: boolean
    html?: boolean
    class?: string
    background?: string
    color?: string
    align?: "left"|"right"
    itemTransform?: LabelDecorator
}

export interface Decorators{
    labelDecorators: {[name:string]: LabelDecorator}
}
export interface DefaultColumns{
    columns?: string[]
}
export interface EnumDescriptions{
    enumDescriptions?: string[]
}
export interface PropOrder{
    propOrder?: string[]
}
export interface AlternativeGroups{
    alternativeGroups?: string[]| string[][]
}
export interface EqualTo{
    equalTo?: string
}
export interface EnumValues{
    enumValues?: string
}
export interface TypeAhead{
    typeahead?: string
}
export interface Ordered{
    ordered?: boolean
}
export interface DiscriminatorValueInfo{
    discriminationInfo: {[name:string]:string[] }
}

import types=require("./types")

export interface HasValidator{
    instanceValidator?:types.InstanceValidator| string| string[]
    overrideDefaultValidators?:boolean
    errorMessage?: string
}
export interface OwningCollection{
    owningCollection?:types.CollectionBinding|types.IBinding
    uniquinessException?:any
}
export interface Representation{
    representation?:string
}
export interface Unique{
    unique?:boolean
    uniqueValue?:boolean
}

export type Condition=string|((v:types.IGraphPoint)=>boolean)

export interface VisibleWhen{
    visibleWhen?:Condition;
    hiddenWhen?:Condition;
}
export interface RequiredWhen{
    requiredWhen?:Condition
    requiredWhenMessage?:string
}

export interface DisabledWhen{
    disabledWhen?:(v:types.IGraphPoint)=>boolean;
}

export interface WebCollection{
    location?: string
    url?: string
    baseUri?: string
    paging?: boolean
    results?: string
    total?: string
    pagesStartFromZero?:boolean
    pageSizePointer?: string
    pageNumberPointer?: string
    errorIn?: string
    method?: string
    parameters?:types.Parameter[]
    securedBy?: string[]
}

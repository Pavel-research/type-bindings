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

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

export interface Label{
    label?: string | ((v:any)=>string)
}
export interface KeyProp{
    keyProp?: string
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
export interface EnumValues{
    enumValues?: string
}
export interface TypeAhead{
    typeahead?: string
}
export interface Ordered{
    ordered?: boolean
}

import types=require("./types")

export interface HasValidator{
    instanceValidator?:types.InstanceValidator
    overrideDefaultValidators?:boolean
    errorMessage?: string
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
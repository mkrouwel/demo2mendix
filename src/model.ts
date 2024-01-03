export interface Model {
    templateid?: string,
    appname: string,
    model: DEMOModel
}
interface DEMOModel {
    transactorroles: TransActorRole[],
    compositeactorroles: ActorRole[],
    initiates: Initiation[],
    factkinds: FactKind[],
    actionrules: ActionRule[]
}
interface TransActorRole {
    id: string,
    transactionkindname: string,
    actorrolename: string,
    focus: boolean,
    casekinds: string[],
    product: string,
    productname: string
}
interface ActorRole {
    id: string, name: string,
}
interface Initiation {
    tk: string, ctar?: string, ear?: string
}
interface FactKind {
    name: string,
    type: string,
    domain?: string,
    range?: string
}
interface ActionRule {

}
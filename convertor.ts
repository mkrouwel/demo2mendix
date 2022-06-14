import { json } from "stream/consumers";
import { MendixPlatformClient,  } from "mendixplatformsdk";
import { IModel, projects, security, domainmodels } from "mendixmodelsdk";

const jsonString = require('./demomodel.json');

const model = await loginAndCreateNewMendixApplication();
const modelProject : projects.IProject = model.allProjects()[0];
const module = projects.Module.createIn(modelProject);
const moduleSecurity = security.ModuleSecurity.createIn(jsonString.defaultmodule);
const domainModel = domainmodels.DomainModel.createIn(module);

// transaction kinds
for(var i = 0; i < jsonString.transactionkinds.length; i++) {
    var t = jsonString.transactionkinds[i];
    if(t.type === "elementary") {
        const entity = domainmodels.Entity.createIn(domainModel);
        entity.name = t.name;
    }
}

// actor roles

// entity types

// action rules

async function loginAndCreateNewMendixApplication() : Promise<IModel> {
    const client = new MendixPlatformClient();
    const app = await client.createNewApp(jsonString.name + new Date());
    const workingCopy = await app.createTemporaryWorkingCopy("main");
    return await workingCopy.openModel();
}
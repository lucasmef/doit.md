import { connectDB, ItemModel, FolderModel } from '@doit/db'
import { repairMojibakeText } from '@doit/md'

async function run() {
  await connectDB()
  
  const items = await ItemModel.find({}).lean()
  let countItems = 0
  for (const item of items) {
    const fixedTitle = repairMojibakeText(item.title)
    const fixedContent = item.contentMd ? repairMojibakeText(item.contentMd) : item.contentMd
    
    if (fixedTitle !== item.title || fixedContent !== item.contentMd) {
      await ItemModel.updateOne(
        { id: item.id },
        { $set: { title: fixedTitle, contentMd: fixedContent } }
      )
      countItems++
      console.log(`Corrigido item: ${fixedTitle}`)
    }
  }

  const folders = await FolderModel.find({}).lean()
  let countFolders = 0
  for (const folder of folders) {
    const fixedName = repairMojibakeText(folder.name)
    if (fixedName !== folder.name) {
      await FolderModel.updateOne(
        { id: folder.id },
        { $set: { name: fixedName } }
      )
      countFolders++
      console.log(`Corrigida pasta: ${fixedName}`)
    }
  }

  console.log(`Concluído. Itens corrigidos: ${countItems}, Pastas corrigidas: ${countFolders}`)
  process.exit(0)
}

run().catch(err => {
  console.error(err)
  process.exit(1)
})

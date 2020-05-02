const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const fs = require("fs")
let win;

const createWindows = () => {
    win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: false,
            preload: __dirname+'/js/preload.js'
        }
    })

    win.loadFile(__dirname+'/views/index.html')
}

app.whenReady().then(createWindows)

const selectDir = () => dialog.showOpenDialog(win, {
    properties: ['openDirectory'],
    title: 'BlenderHubのディレクトリを設定する',
    defaultPath: app.getPath('home'),
})

const setting = async () => {
    await dialog.showMessageBox(win, {
        type: 'info',
        buttons: ['OK'],
        title: 'データベースの設定',
        message: 'データベースが存在しません',
        detail: 'BlenderHubの実行にはデータベースが必要です。\nOKをクリックして、データベースを保存するフォルダを選択してください。\n以降はこのフォルダにBlenderがインストールされます。'
    })
    while (1) {
        result = await selectDir()
        if (result.canceled) {
            await dialog.showMessageBox(win, {
                type: 'error',
                buttons: ['OK'],
                title: 'キャンセル',
                message: 'キャンセルされました',
                detail: 'BlenderHubの起動には設定が必要です。再度起動して設定してください。'
            })
            app.quit()
        } else {
            let configData = { "path": result.filePaths[0] }
            let initConfig = { "versions": [] }
            console.log(initConfig);
            try {
                fs.writeFileSync('./config.json', JSON.stringify(configData, null, "    ",))
                if (!fs.existsSync(result.filePaths[0]+'/database.json')) {
                    fs.writeFileSync(result.filePaths[0]+'/database.json', JSON.stringify(initConfig, null, "    ",))
                }
                return result.filePaths[0]
            } catch (error) {
                fs.unlinkSync('./config.json')
                await dialog.showMessageBox(win, {
                    type: 'error',
                    buttons: ['OK'],
                    title: '書き込みエラー',
                    message: '書き込みエラーが発生しました',
                    detail: `${error}\n書き込み権限が無い可能性があります。\n例えばCドライブ直下などは指定できません`
                })
            }
        }
    }
}

ipcMain.on('load_database', (event, arg) => {
    new Promise ((resolve, reject) => {
        if (!fs.existsSync('./config.json')) {
            setting().then(result => {
                resolve(result)
            })
        } else {
            config = JSON.parse(fs.readFileSync('./config.json'))
            resolve(config.path)
    }}).then((dbpath) => {
        if (fs.existsSync(dbpath+'/database.json')) {
            database_ts = JSON.parse(fs.readFileSync(dbpath+'/database.json'))
            event.sender.send('send_database', database_ts)
        } else {
            fs.unlinkSync('./config.json')
            setting().then(result => {
                database_ts = JSON.parse(fs.readFileSync(result+'/database.json'))
                event.sender.send('send_database', database_ts)
            })
        }
    })
})

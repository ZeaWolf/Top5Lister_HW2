import React from 'react';
import './App.css';

// IMPORT DATA MANAGEMENT AND TRANSACTION STUFF
import DBManager from './db/DBManager';

// THESE ARE OUR REACT COMPONENTS
import DeleteModal from './components/DeleteModal';
import Banner from './components/Banner.js';
import Sidebar from './components/Sidebar.js';
import Workspace from './components/Workspace.js';
import Statusbar from './components/Statusbar.js';
import jsTPS from "./components/jsTPS.js";
import ChangeItem_Transaction from "./components/ChangeItem_Transaction";
import MoveItem_Transaction from "./components/MoveItem_Transaction";

class App extends React.Component {
    constructor(props) {
        super(props);

        // THIS WILL TALK TO LOCAL STORAGE
        this.db = new DBManager();

        this.tps = new jsTPS();

        window.addEventListener('keydown', this.undoRedoKey);

        // GET THE SESSION DATA FROM OUR DATA MANAGER
        let loadedSessionData = this.db.queryGetSessionData();

        // SETUP THE INITIAL STATE
        this.state = {
            currentList : null,
            sessionData : loadedSessionData,
            itemOldIndex: null,
            listKeyPair : {exist:false, pair:null}
        }
    }
    sortKeyNamePairsByName = (keyNamePairs) => {
        keyNamePairs.sort((keyPair1, keyPair2) => {
            // GET THE LISTS
            return keyPair1.name.localeCompare(keyPair2.name);
        });
    }
    // THIS FUNCTION BEGINS THE PROCESS OF CREATING A NEW LIST
    createNewList = () => {
        // FIRST FIGURE OUT WHAT THE NEW LIST'S KEY AND NAME WILL BE
        if(this.state.currentList === null){
            let newKey = this.state.sessionData.nextKey;
            let newName = "Untitled" + newKey;

            // MAKE THE NEW LIST
            let newList = {
                key: newKey,
                name: newName,
                items: ["?", "?", "?", "?", "?"]
            };

            // MAKE THE KEY,NAME OBJECT SO WE CAN KEEP IT IN OUR
            // SESSION DATA SO IT WILL BE IN OUR LIST OF LISTS
            let newKeyNamePair = { "key": newKey, "name": newName };
            let updatedPairs = [...this.state.sessionData.keyNamePairs, newKeyNamePair];
            this.sortKeyNamePairsByName(updatedPairs);

            // CHANGE THE APP STATE SO THAT IT THE CURRENT LIST IS
            // THIS NEW LIST AND UPDATE THE SESSION DATA SO THAT THE
            // NEXT LIST CAN BE MADE AS WELL. NOTE, THIS setState WILL
            // FORCE A CALL TO render, BUT THIS UPDATE IS ASYNCHRONOUS,
            // SO ANY AFTER EFFECTS THAT NEED TO USE THIS UPDATED STATE
            // SHOULD BE DONE VIA ITS CALLBACK
            this.setState(prevState => ({
                currentList: newList,
                sessionData: {
                    nextKey: prevState.sessionData.nextKey + 1,
                    counter: prevState.sessionData.counter + 1,
                    keyNamePairs: updatedPairs
                },
                itemOldIndex: this.state.itemOldIndex,
                listKeyPair : this.state.listKeyPair
            }), () => {
                // PUTTING THIS NEW LIST IN PERMANENT STORAGE
                // IS AN AFTER EFFECT
                this.db.mutationCreateList(newList);
                this.updateToolbarButtons();
            });
        }
    }
    renameList = (key, newName) => {
        let newKeyNamePairs = [...this.state.sessionData.keyNamePairs];
        // NOW GO THROUGH THE ARRAY AND FIND THE ONE TO RENAME
        for (let i = 0; i < newKeyNamePairs.length; i++) {
            let pair = newKeyNamePairs[i];
            if (pair.key === key) {
                pair.name = newName;
            }
        }
        this.sortKeyNamePairsByName(newKeyNamePairs);

        // WE MAY HAVE TO RENAME THE currentList
        let currentList = this.state.currentList;
        if (currentList.key === key) {
            currentList.name = newName;
        }

        this.setState(prevState => ({
            currentList: prevState.currentList,
            sessionData: {
                nextKey: prevState.sessionData.nextKey,
                counter: prevState.sessionData.counter,
                keyNamePairs: newKeyNamePairs,
            },
            itemOldIndex: this.state.itemOldIndex,
            listKeyPair : this.state.listKeyPair
        }), () => {
            // AN AFTER EFFECT IS THAT WE NEED TO MAKE SURE
            // THE TRANSACTION STACK IS CLEARED
            let list = this.db.queryGetList(key);
            list.name = newName;
            this.db.mutationUpdateList(list);
            this.db.mutationUpdateSessionData(this.state.sessionData);
            this.updateToolbarButtons();
        });
    }
    // THIS FUNCTION BEGINS THE PROCESS OF LOADING A LIST FOR EDITING
    loadList = (key) => {
        let newCurrentList = this.db.queryGetList(key);
        if(this.state.currentList !== null){
            if(this.state.currentList.key !== newCurrentList.key){
                this.tps.clearAllTransactions();
            }
        }
        this.setState(prevState => ({
            currentList: newCurrentList,
            sessionData: prevState.sessionData,
            itemOldIndex: this.state.itemOldIndex,
            listKeyPair : this.state.listKeyPair
        }), () => {
            // ANY AFTER EFFECTS?
            this.updateToolbarButtons();
        });
    }
    // THIS FUNCTION BEGINS THE PROCESS OF CLOSING THE CURRENT LIST
    closeCurrentList = () => {
        this.setState(prevState => ({
            currentList: null,
            listKeyPairMarkedForDeletion : prevState.listKeyPairMarkedForDeletion,
            sessionData: this.state.sessionData,
            itemOldIndex: this.state.itemOldIndex,
            listKeyPair : this.state.listKeyPair
        }), () => {
            // ANY AFTER EFFECTS?
            this.tps.clearAllTransactions();
            this.updateToolbarButtons();
            
        });
    }
    deleteList = (keyNamePair) => {
        // SOMEHOW YOU ARE GOING TO HAVE TO FIGURE OUT
        // WHICH LIST IT IS THAT THE USER WANTS TO
        // DELETE AND MAKE THAT CONNECTION SO THAT THE
        // NAME PROPERLY DISPLAYS INSIDE THE MODAL
        this.setState({
            currentList: this.state.currentList,
            sessionData: this.state.sessionData,
            itemOldIndex: this.state.itemOldIndex,
            listKeyPair : {exist : true, pair: keyNamePair}
        })
        this.showDeleteListModal();
        this.updateToolbarButtons();
    }
    // THIS FUNCTION SHOWS THE MODAL FOR PROMPTING THE USER
    // TO SEE IF THEY REALLY WANT TO DELETE THE LIST
    showDeleteListModal() {
        let modal = document.getElementById("delete-modal");
        modal.classList.add("is-visible");
    }
    // THIS FUNCTION IS FOR HIDING THE MODAL
    hideDeleteListModal() {
        // this.setState({
        //     currentList: this.state.currentList,
        //     sessionData: this.state.sessionData,
        //     itemOldIndex: this.state.itemOldIndex,
        //     listKeyPair : {exist : "false", name : null}
        // })
        let modal = document.getElementById("delete-modal");
        modal.classList.remove("is-visible");
    }

    // part2 
    changeItem = (index, newName) => {
        let temp = this.state.currentList;
        for(let i = 0; i < temp.items.length; i++){
            if(i === index){
                temp.items[i] = newName
            }
        }
        
        this.setState(prevState => ({
            currentList: temp,
            sessionData: this.state.sessionData,
            itemOldIndex: this.state.itemOldIndex,
            listKeyPair : this.state.listKeyPair
        }), () => {
            this.db.mutationUpdateList(temp);
            this.db.mutationUpdateSessionData(this.state.sessionData);
            this.updateToolbarButtons();
        });
    }

    // part 3 and 4
    setOldIndex = (oldIndex) =>{
        this.setState({
            currentList : this.state.currentList,
            sessionData : this.state.sessionData,
            itemOldIndex: oldIndex,
            listKeyPair : this.state.listKeyPair
        })
    }
    getOldIndex = () =>{
        return this.state.itemOldIndex;
    }
    moveItem = (oldIndex, newIndex) =>{
        let temp = this.state.currentList;
        temp.items.splice(newIndex, 0, temp.items.splice(oldIndex, 1)[0]);
        this.setState(prevState => ({
            currentList: temp,
            sessionData: this.state.sessionData,
            itemOldIndex: this.state.itemOldIndex,
            listKeyPair : this.state.listKeyPair
        }), () => {
            this.db.mutationUpdateList(temp);
            this.db.mutationUpdateSessionData(this.state.sessionData);
            this.updateToolbarButtons();
        });
    }

    //part 5
    deleteListConfirm = () =>{
        // WE MAY HAVE TO remove THE currentList
        let currentList = this.state.currentList;
        if(currentList !== null){
            if (currentList.key === this.state.listKeyPair.pair.key) {
                this.closeCurrentList();
            }
        }
        
        if(this.state.listKeyPair.exist) {
            this.db.deleteList(this.state.listKeyPair.pair.key);
        }

        let newKeyNamePairs = [...this.state.sessionData.keyNamePairs];
        // NOW GO THROUGH THE ARRAY AND FIND THE ONE TO remove
        let deleteIndex = -1;
        for (let i = 0; i < newKeyNamePairs.length; i++) {
            let pair = newKeyNamePairs[i];
            if (pair.key === this.state.listKeyPair.pair.key) {
                deleteIndex = i;
            }
        }

        newKeyNamePairs.splice(deleteIndex, 1);
        this.sortKeyNamePairsByName(newKeyNamePairs);

        

        this.setState(prevState => ({
            currentList: prevState.currentList,
            sessionData: {
                nextKey: prevState.sessionData.nextKey,
                counter: prevState.sessionData.counter,
                keyNamePairs: newKeyNamePairs,
            },
            itemOldIndex: this.state.itemOldIndex,
            listKeyPair : {exist:false, pair:null}
        }), () => {
            // AN AFTER EFFECT IS THAT WE NEED TO MAKE SURE
            // THE TRANSACTION STACK IS CLEARED
            this.db.mutationUpdateSessionData(this.state.sessionData);
            this.updateToolbarButtons();
            this.hideDeleteListModal();
        });
    }

    // part7
    addMoveItemTransaction = (oldIndex, newIndex) => {
        let transaction = new MoveItem_Transaction(this, oldIndex, newIndex);
        this.tps.addTransaction(transaction);
    }
    addChangeItemTransaction = (id, newText) => {
        // GET THE CURRENT TEXT
        let oldText = this.state.currentList.items[id];
        let transaction = new ChangeItem_Transaction(this, id, oldText, newText);
        this.tps.addTransaction(transaction);
    }
    undo = () => {
        if (this.tps.hasTransactionToUndo()) {
            this.tps.undoTransaction();
        }
        this.updateToolbarButtons();

    }
    redo = () =>{
        if(this.tps.hasTransactionToRedo()){
            this.tps.doTransaction();
        }
        this.updateToolbarButtons();
    }
    updateToolbarButtons=()=> {
        let tps = this.tps;
        if (!tps.hasTransactionToUndo()) {
            this.disableButton("undo-button");
        }
        else {
            this.enableButton("undo-button");
        }
        if (!tps.hasTransactionToRedo()) {
            this.disableButton("redo-button");
        }
        else {
            this.enableButton("redo-button");
        }
        if (this.state.currentList !== null){
            this.enableButton("close-button");
            this.disableButton("add-list-button");
        }
        else{
            this.disableButton("close-button");
            this.enableButton("add-list-button");
        }
    }
    disableButton=(id)=> {
        let button = document.getElementById(id);
        button.classList.replace("top5-button","top5-button-disabled");
    }

    enableButton=(id)=> {
        let button = document.getElementById(id);
        button.classList.replace("top5-button-disabled", "top5-button");
    }

    undoRedoKey = (event) =>{
        if((event.ctrlKey && event.key === 'z') || (event.ctrlKey && event.key === 'Z')){
            this.undo();
        }
        if((event.ctrlKey && event.key === 'y') || (event.ctrlKey && event.key === 'Y')){
            this.redo();
        }
    }

    render() {
        return (
            <div id="app-root">
                <Banner 
                    title='Top 5 Lister'
                    closeCallback={this.closeCurrentList} 
                    undoCallback={this.undo}
                    redoCallback={this.redo}/>
                <Sidebar
                    heading='Your Lists'
                    currentList={this.state.currentList}
                    keyNamePairs={this.state.sessionData.keyNamePairs}
                    createNewListCallback={this.createNewList}
                    deleteListCallback={this.deleteList}
                    loadListCallback={this.loadList}
                    renameListCallback={this.renameList}
                />
                <Workspace
                    currentList={this.state.currentList} 
                    addChangeItemTransactionCallback={this.addChangeItemTransaction}
                    addMoveItemTransactionCallback={this.addMoveItemTransaction}
                    setOldIndexCallback={this.setOldIndex}
                    getOldIndexCallback={this.getOldIndex}
                />
                <Statusbar 
                    currentList={this.state.currentList} />
                <DeleteModal
                    listKeyPair = {this.state.listKeyPair}
                    deleteListConfirmCallback = {this.deleteListConfirm}
                    hideDeleteListModalCallback={this.hideDeleteListModal}
                />
            </div>
        );
    }
}

export default App;

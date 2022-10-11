import React from "react";

export default class ItemCard extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            index: this.props.itemIndex,
            text: this.props.itemName,
            editActive: false,
            class: "top5-item"
        }
    }

    handleClick = (event) => {
        if(event.detail===1){
            this.setState({
                index: this.props.itemIndex,
                text: this.props.itemName,
                editActive: false,
                class: "top5-item"
            })
        }
        else if (event.detail === 2) {
            this.handleToggleEdit(event);
        }
    }

    handleToggleEdit = (event) => {
        this.setState({
            // index: this.props.itemIndex,
            // text: this.props.itemName,
            editActive: !this.state.editActive
        });
    }

    handleUpdate = (event) => {
        let newText = event.target.value;
        this.setState({ text: newText });
    }

    handleKeyPress = (event) => {
        if (event.code === "Enter") {
            this.handleBlur();
        }
    }

    handleBlur = () => {
        this.props.addChangeItemTransactionCallback(this.props.itemIndex, this.state.text);
        this.handleToggleEdit();
    }

    
    // static oldIndex = null;
    handleDragStart = (event) =>{
        this.props.setOldIndexCallback(this.state.index);
    }
    handleDragOver = (event) =>{
        event.preventDefault();
        this.setState({
            index: this.state.index,
            text: this.state.text,
            editActive: this.state.editActive,
            class: "top5-item-dragged-to"
        })
        
    }
    handleDragLeave = (event) =>{
        event.preventDefault();
        this.setState({
            index: this.state.index,
            text: this.state.text,
            editActive: this.state.editActive,
            class: "top5-item"
        })
    }
    handleDrop = (event) =>{
        this.props.addMoveItemTransactionCallback(this.props.getOldIndexCallback(), this.state.index);
        this.setState({
            index: this.state.index,
            text: this.state.text,
            editActive: this.state.editActive,
            class: "top5-item"
        })
    }


    render() {
        const { itemName, itemIndex } = this.props;
        if (this.state.editActive) {
            return (
                <input autoFocus
                    id = {"item-card-" + itemIndex}
                    className="top5-item"
                    type="text"
                    onKeyPress={this.handleKeyPress}
                    onBlur={this.handleBlur}
                    onChange={this.handleUpdate}
                    defaultValue={this.state.text}
                />)
        }
        else{
            return(
                <div
                id = {"item-card-" + itemIndex}
                key = { itemIndex }
                onClick={this.handleClick}
                draggable = "true"
                onDragStart = {this.handleDragStart}
                onDragOver = {this.handleDragOver}
                onDragLeave = {this.handleDragLeave}
                onDrop = {this.handleDrop}
                className={this.state.class}>
                    <span
                        id = {"item-card-text-" + itemIndex}
                        key = { itemIndex }
                        className = "item-card-text">
                        {itemName}
                    </span>
                </div>)
        }    
    }
}
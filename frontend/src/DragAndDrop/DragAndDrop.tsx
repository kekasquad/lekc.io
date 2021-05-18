import React from 'react';
import './DragAndDrop.css';

interface IProps {
    handleFileDrop?: any
}

interface IState {
    dragging?: boolean
}

export default class DragAndDrop extends React.Component<IProps, IState> {
    private dropRef = React.createRef<HTMLDivElement>();

    constructor(props: any) {
        super(props);
    }

    componentDidMount() {
        const dropDiv = this.dropRef.current;
        if (dropDiv) {
            dropDiv.addEventListener('dragenter', this.handleDragIn);
            dropDiv.addEventListener('dragleave', this.handleDragOut);
            dropDiv.addEventListener('dragover', this.handleDrag);
            dropDiv.addEventListener('drop', this.handleDrop);
        } 
    }

    componentWillUnmount() {
        const dropDiv = this.dropRef.current;
        if (dropDiv) {
            dropDiv.removeEventListener('dragenter', this.handleDragIn);
            dropDiv.removeEventListener('dragleave', this.handleDragOut);
            dropDiv.removeEventListener('dragover', this.handleDrag);
            dropDiv.removeEventListener('drop', this.handleDrop);
        } 
    }
    handleDrag = (e: any) => {
        e.preventDefault();
        e.stopPropagation();
    }
      
    handleDragIn = (e: any) => {
        e.preventDefault();
        e.stopPropagation(); 
        if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
            this.setState({ dragging: true });
        }
    }
      
    handleDragOut = (e: any) => {
        e.preventDefault();
        e.stopPropagation();
        this.setState({ dragging: false });
    }

    handleDrop = (e: any) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            this.props.handleFileDrop(e.dataTransfer.files);
            e.dataTransfer.clearData();
        }
    }

    render(): JSX.Element {
        return (
            <div className='profile_content_change_image_drop' ref={this.dropRef}>
                {this.props.children}
            </div>
        );
    }

}
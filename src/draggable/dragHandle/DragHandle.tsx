import './drag-handle.css'

export default function DragHandle({id}: any) {


    return (
        <div className="drag-handle"
        id={id}>
            <div className="drag-handle__dots">
                {[...Array(6)].map((_, i) => (
                    <span key={i} className="drag-handle__dot" />
                ))}
            </div>
        </div>
    )
}
 
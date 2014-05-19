module SteelBlue
{
  export class FileUploader
  {
  	static self: FileUploader; // TODO: Delete.
  	private httpobj: MyXMLHttpRequest;
  	private reader: MyFileReader;
  	static boundary: string = "";
  	private callback: ( msg: string ) => any;
  	private file;

    constructor()
    {
      this.httpobj = null;
      this.reader = null;
      this.callback = null;
      // TODO:
      if ( FileUploader.boundary == "" )
      {
        FileUploader.boundary = "----SDDUploaderFormBoundary" + this.RandomString( 20 );
      }
      FileUploader.self = this;
    }

    public SetCallback( cbfunc: ( msg: string ) => any )
    {
      this.callback = cbfunc;
    }

    public UploadFile( address: string, path: string, file: File ): MyXMLHttpRequest
    {
      this.httpobj = this.HttpCreate();
      this.httpobj.open( "post", address, false );
      if ( this.httpobj == null ){ return null; }

      this.file = file;

      this.reader = <MyFileReader>new FileReader();
      this.reader.onload = function( event: any ){ FileUploader.self.FileLoader( event, path ) };
      this.reader.readAsBinaryString( file );
      return this.httpobj;
    }

    private FileLoader( event: any, path: string )
    {
      var data: string = "";

      // Multipart header.
      this.MultipartHeader();

      // File data.
      data += this.MultipartFile( 'upfile', this.file );

      // Path data.
      data += this.MultipartData( 'path', path );

      // Multipart footer.
      data += this.MultipartFooter();

      // Send data.
      this.httpobj.sendAsBinary( data );

      // Result.
      if ( this.callback != null )
      {
      	this.callback( this.httpobj.responseText );
      }

    }

    private HttpCreate(): MyXMLHttpRequest
    {
      if ( window.navigator.userAgent.toLowerCase().indexOf( "chrome" ) > -1)
      {
        var xhr: any = XMLHttpRequest;
        xhr.prototype.sendAsBinary = function( datastr )
        {
          function byteValue( x ) { return x.charCodeAt( 0 ) & 0xff; }
          var ords = Array.prototype.map.call( datastr, byteValue );
          var ui8a = new Uint8Array( ords );
          try
          {
            this.send( ui8a );
          } catch( error )
          {
            this.send( ui8a.buffer );
          }
        }
      }

      try
      {
        this.httpobj = <MyXMLHttpRequest>new XMLHttpRequest();
      } catch( e )
      {
        this.httpobj = null;
      }

      return this.httpobj;
    }

    private MultipartHeader()
    {
      this.httpobj.setRequestHeader( "content-type", "multipart/form-data; boundary=" + FileUploader.boundary );
    }

    private MultipartFooter()
    {
      return "--" + FileUploader.boundary + "--";
    }

    private MultipartData( name: string, data: string )
    {
      var str: string = "--" + FileUploader.boundary + "\r\n";
      str += "Content-Disposition: form-data; name=\"" + name + "\"\r\n";
      str += "\r\n";
      str += data + "\r\n";
      return str;
    }

    private MultipartFile( name: string, file: File )
    {
      var str: string = "--" + FileUploader.boundary + "\r\n";

      str += "Content-Disposition: form-data; name=\"" + name + "\"; filename=\"" + encodeURIComponent( file.name ) + "\"\r\n";
      str += "Content-Type: "+ file.type + "\r\n";
      str += "\r\n";
      str += this.reader.result + "\r\n";

      return str;
    }
    private RandomString( n:number ):string
    {
      var a:string[] = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-!_#$'.split('');
      var s:string = '';
      for (var i = 0; i < n; i++)
      {
        s += a[ Math.floor( Math.random() * a.length ) ];
      }
      return s;
    }
  } // End class FileUploader

  export interface MyXMLHttpRequest extends XMLHttpRequest
  {
    sendAsBinary( str: string ): void;
  }

  export interface MyFileReader extends FileReader
  {
  	readAsBinaryString( data: any ): any;
  }

  export interface UploadResult
  {
    result: string;
    msg: string; 
  }

  export class FileUploaderManagement
  {
  	static self: FileUploaderManagement; // TODO: Delete.
    private darea: HTMLElement;
    private larea: HTMLElement;
    private parea: HTMLInputElement;
    private UPLOADED: number;
    private UPLOADMAX: number;
    private files: File[];
    private path: string;

    constructor( id_area: string, id_loader: string, id_path: string )
    {
      this.darea = document.getElementById( id_area );
      this.larea = document.getElementById( id_loader )
      this.parea = <HTMLInputElement>document.getElementById( id_path );
      FileUploaderManagement.self = this;
      if( this.darea.addEventListener )
      {
        this.darea.addEventListener( 'dragover', function( event:any ){ FileUploaderManagement.self.DragOver( event ); }, false );
        this.darea.addEventListener( 'drop', function( event:any ){ FileUploaderManagement.self.Drop( event ); }, false );
      } else if( this.darea.attachEvent )
      {
        this.darea.attachEvent( 'ondragover', function( event: any ){ FileUploaderManagement.self.DragOver( event ); } );
        this.darea.attachEvent( 'ondrop', function( event: any ){ FileUploaderManagement.self.Drop( event ); } );
      }
      this.UPLOADED = 0;
      this.UPLOADMAX = 0;
    }

    private DragOver( event: any )
    {
      event.preventDefault();
    }

    private Drop( event: any )
    {
      event.preventDefault();

      this.files = event.dataTransfer.files;

      if( this.darea.addEventListener )
      {
        this.darea.addEventListener( 'dragover', null, false );
        this.darea.addEventListener( 'drop', null, false );
      } else if( this.darea.attachEvent )
      {
        this.darea.attachEvent( 'ondragover', null );
        this.darea.attachEvent( 'ondrop', null );
      }

      this.path = this.parea.value;

      this.larea.innerHTML = '<div id="loader"></div>';

      this.UPLOADED = 0;
      this.UPLOADMAX = this.files.length;

      var uf = new FileUploader();
      uf.UploadFile( "./uploader.cgi", this.path, this.files[ this.UPLOADED ] );
      uf.SetCallback( function( msg: string ){ FileUploaderManagement.self.NextUpload( msg ); } );
    }

    public NextUpload( msg: string )
    {
      var result: UploadResult = <UploadResult>JSON.parse( msg );

      // Update progress bar.
      var loader = document.getElementById( 'loader' );

      var failid = '';
      if ( result.result != 'success' ){ failid = ' class="error"' }

      loader.innerHTML += '<div style="width:' + ( 100 / this.UPLOADMAX ) + '%;"' + failid + '></div>';

      ++this.UPLOADED;

      if ( this.UPLOADED < this.UPLOADMAX )
      {
      	var uf = new FileUploader();
      	uf.UploadFile( "./uploader.cgi", this.path, this.files[ this.UPLOADED ] );
        uf.SetCallback( function( msg: string ){ FileUploaderManagement.self.NextUpload( msg ); } );
      } else
      {
        window.location.reload();
      }
    }

  }

}

function Init()//TODO: fix
{
  new SteelBlue.FileUploaderManagement( 'dragupload', 'dragupload', 'path' );
}

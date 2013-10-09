#!/usr/bin/perl

use strict;
use warnings;
use CGI;

########################################
# Setting                              #
########################################

# Document root.
our $DOCROOT = '.';

# Default directory permission.
our $DIRPARMISIION  = 0705;

# Read buffer size.
our $BUFFERSIZE = 1024;

# Max upload size.
our $MAXSIZE = 0;

# JSON ContentType
our $JSONCONTENTTYPE = 'Content-Type: application/json; charset=utf-8';

########################################
# Program                              #
########################################

print &Main();

sub Main()
{
  my $query = new CGI;

  my $ref = &Decode( $query->param( 'ref' ) );

  my $upfile = ( $query->param( 'upfile' ) );

  # File size check.
  if ( $MAXSIZE > 0 )
  {
    my ( @state ) = stat( $upfile );
    if ( $MAXSIZE < $state[ 7 ] ){ return &Error( $ref, sprintf( 'File size over(max:%dB).', $MAXSIZE ) ); }
  }

  # Path check.
  my $path = &Decode( $query->param( 'path' ) );
  if ( $path =~ /(\.\.)/ || $path =~ /^(\/)/ ){ return &Error( $ref, 'Upload path error.' ); }
  if ( $path eq '' ){ $path = './'; }

  if ( $upfile =~ /(\/)$/ || $upfile =~ /([^ \da-zA-Z\_\-\+\=\(\) \"\'\:\;\&\%\$\#\@\!\?\<\>\[\]\{\}\.\,])/ ){ return &Error( $ref, sprintf( 'File name illegal.(%s)', $upfile ) ); }

  # Directory check & create filepath;
  unless ( -d $DOCROOT . '/' . $path )
  {
    my $name;
    my ( @el ) = split( /\//, $path );

    if ( $path =~ /(\/)$/ )
    {
      # Path is directory.
      $name = $upfile;
    } else
    {
      # Path is filepath.
      $name = pop( @el );
    }

    # Make directory.
    $path = shift( @el ) . '/';
    foreach ( @el )
    {
      unless ( -d $DOCROOT . '/' . $path . $_ ){ mkdir( $DOCROOT . '/' . $path . $_, $DIRPARMISIION ); }
      $path .= $_ . '/';
    }

    $path .= $name;
  } else
  {
    my $name = $upfile;
    $path .= ( ($path =~ /(\/)$/) ? '' : '/' ) . $name;
  }

  $path = $DOCROOT . '/' . $path;

  # File copy.
  if ( &CopyFile( $path, $upfile ) ){ return &Error( $ref, sprintf( 'Cannot create file.(%s)', $upfile ) ); }

  close( $upfile );

  return &Success( $ref );
}

sub CopyFile()
{
  my ( $path, $upfile ) = ( @_ );
  my $buffer;

  if ( open( OUT, ">$path" ) )
  {
    binmode( OUT );
    while( read( $upfile, $buffer, $BUFFERSIZE ) )
    {
      print OUT $buffer;
    }
    close( OUT );
    return 0;
  }
  return 1;
}

sub Location()
{
  return sprintf( 'Location:%s', $_[ 0 ] ) . "\n\n";
}

sub Success()
{
  my ( $ref ) = ( @_ );
  if ( $ref ) { return &Location( $ref ); }
  return sprintf( '%s{"result":"success"}', $JSONCONTENTTYPE . "\n\n" );
}

sub Error()
{
  my ( $ref, $msg ) = ( @_ );
  if ( $ref ) { return &Location( $ref ); }
  return sprintf( '%s{"result":"failure","msg":"%s"}', $JSONCONTENTTYPE . "\n\n", $msg );
}

sub Decode()
{
  my ( $val ) = ( @_ );
  $val =~ tr/+/ /;
  $val =~ s/%([0-9a-fA-F][0-9a-fA-F])/pack('C', hex($1))/eg;
  return $val;
}